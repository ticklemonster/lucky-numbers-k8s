// NumbersStore
// - uses a REDIS store to manage lucky numbers, passed in the constructor
//
// Clients will often GET recent values for history
// Clients will sometimes GET by date (to check winners in a timeframe)
// 
// Approach:
//  - SET of numbers for each generated result [numbers:unixtime] 
//  - ZSET [numbers.date.index] to search and retrieve by unixtime (score)
//  (- LIST [numbers.recent] for recent results is not required using the ZSET by date)
// 
//  - HASH for each guess [guess:id] with detailed info
//      if no "id" is provided, a random one will be generated
//      should include a messaging ID for the player
//  - SET for numbers in each guess [guess:id.numbers]
//  - ZSET [guess.date.index] of guess ids by the time they are guessing
//
//  Checking for winners will involve:
//      - get every guess id in the ZSET [guess.date.index] for this date
//      - intersect the [guess:id.numbers] set with the [numbers:unixtime]
//

const { EventEmitter } = require('events');
const os = require('os');
const redis = require('redis');
const uuid = require('uuid/v4');

const REDIS_MAX_NUMBERS = 7 * 24 * 60;  // 1 week of results at 1 minute 
const REDIS_RECENT_SIZE = 4 * 60;       // 4 hours of results at 1 minute
// const REDIS_MAX_NUMBERS = 25;

// REDIS CONNECTION specs
const REDIS_MAX_RETRIES = 5;
const REDIS_CONNECT_TIMEOUT = 15000;

class Datastore extends EventEmitter {
    constructor (connect_url) {
        super();
        this.version = 0.2;
        this.url = connect_url;
        this.client = redis.createClient({
            url: connect_url,
            retry_strategy: this.retry_strategy.bind(this)
        });

        this.client.on('error', err => console.error('REDIS error: ', err));
        this.client.on('ready', () => {
            console.log(`Database connected to ${this.client.options.url}`);
            this.initRedisStore();
            this.timer_dbclean = setInterval(this.cleanupDb, 60 * 60 * 1000, this);
        });
        this.client.on("reconnect", () => console.log(`REDIS is reconnecting...`));
    }

    retry_strategy (opts) {
        // Retry until we hit max retries or timeout
        // then throw an error to exist the app
        console.warn(`WARNING: REDIS connection retry - error ${opts.error && opts.error.code}, attempt #${opts.attempt} ${opts.total_retry_time}ms`);
        if (opts.attempt > REDIS_MAX_RETRIES) {
            console.error(`Database connect to ${this.client.options.url} tried too many times`);
            throw new Error(`DB connection failed - many retries`);
        }
        if (opts.total_retry_time >= REDIS_CONNECT_TIMEOUT) {
            console.error(`Database connect to ${this.client.options.url} timed out after ${opts.total_retry_time}ms`);
            throw new Error('DB connection failed - timeout');
        }
        return Math.min(opts.attempt * 1000, 10000); // backoff to no more than 10sec
    }

    ready() {
        return this.client.ready;
    }

    close() {
        this.client.end(true);
    }


    // addResults(date, numbers)
    // - saves the results to Redis
    // @date: date of the result draw
    // @numbers: a set of numbers for that draw
    //
    async addResults(date, numbers) {
        if (!this.client || !this.client.ready) {
            throw new Error('DB connection is not ready. Results not saved');
        };

        const dt = new Date(date);
        const id = dt.setSeconds(0, 0).valueOf();   // unix time to the minute
        const resultkey = `numbers:${id}`;
        const dateindex = `numbers.date.index`;
        // console.debug(`Datastore: saving ${resultkey} ${numbers}`);

        // if an entry already exists, return that (and ignore this value)
        const rval = new Promise((resolve,reject) => {
            this.client.setnx(resultkey, os.hostname(), (err, res) => {
                if (err) {
                    console.warn(`Error adding results to Redis: ${err}`);
                    reject(err);
                } else {
                    if (res == 0) {
                        // already exists
                        console.debug(`Results - already exists for this time`);
                        resolve(null);
                    } else {
                        // store the result and index it by date
                        let multi = this.client.multi()
                            .del(resultkey)
                            .sadd(resultkey, numbers)
                            .zadd(dateindex, id, resultkey);
                        
                        // keep some statistics
                        for (let n of numbers) {
                            multi.incr(`drawn:${n}`);
                        }

                        multi.exec( (err, mres) => {
                            if (err) {
                                console.warn(`ERROR adding number to REDIS: ${err}`);
                                reject(err);
                            } else {
                                console.log(`Results saved successfully`);
                                resolve({ 
                                    "id": `${id}`,
                                    "date": new Date(parseInt(id)),
                                    "numbers": numbers.map(n => parseInt(n)) 
                                });
                            }
                        });
    
                    }
                }
            });
        });
                            
        return await rval;
    }

    async getResultsByDate(date) {
        const dt = new Date(date);
        const id = dt.setSeconds(0, 0).valueOf();   // unix time to the minute
        const key = `numbers:${id}`;
        const rval = new Promise((resolve, reject) => {
            this.client.smembers(key, (err, response) => {
                if (err) {
                    console.error(`ERROR getting results for date ${date}: ${err}`);
                    reject(err);
                } if (response) {
                    console.debug(`Results for date ${date} / key ${key} => ${response}`);
                    resolve({ 
                        "id": `${id}`,
                        "date": new Date(parseInt(id)),
                        "numbers": response.map(n => parseInt(n)) 
                    });
                } else {
                    console.debug(`No results found for date ${date} / key ${key}`);
                    resolve(null);
                }
            })
        });

        return await rval;
    }

    async getLastNResultKeys(n) {
        const rval = new Promise((resolve, reject) => {
            this.client.zrevrange("numbers.date.index", 0, n - 1, (err, res) => {
                if (err) {
                    console.error(`ERROR getting last ${n} results: ${err}`);
                    reject(err);
                } else {
                    console.debug(`Last ${n} results found ${res.length} keys`);
                    resolve(res);
                }
            })
        });

        return await rval;
    }

    async getLastNResults(n) {
        const rval = new Promise((resolve, reject) => {
            this.client.zrevrange("numbers.date.index", 0, n - 1, (err, rsp) => {
                if (err) {
                    console.error(`ERROR getting last ${n} results: ${err}`);
                    reject(err);
                } else {
                    console.debug(`Last ${n} results returned ${rsp.length} keys`);
                    
                    // map the response array to number base objects
                    const batch = this.client.batch();
                    for (var r in rsp) {
                        batch.smembers(rsp[r])
                    }
                    batch.exec((err, res) => {
                        if (err) {
                            console.warn(`ERROR getting batch of recent results ${err}`);
                            reject(err);
                        } else {
                            console.debug(`Last ${n} results batch returned ${res.length} result sets`);

                            // map the result set back to an object array
                            let rval = [];
                            for (let i = 0; i < rsp.length; i++) {
                                const key = rsp[i];
                                const [, id] = key.split(':');
                                rval.push({
                                    "id": id, 
                                    "date": new Date(parseInt(id)),
                                    "numbers": res[i].map(m => parseInt(m)) 
                                })
                            }
                            resolve(rval);
                        }
                    });
                }
            })
        });

        return await rval;
    }

    async addGuess (dt, numbers) {
        //  - HASH for each guess [guess:id] with detailed info
        //      if no "id" is provided, a random one will be generated
        //      should include a messaging ID for the player
        //  - SET for numbers in each guess [guess:id.numbers]
        //  - ZSET [guess.date.index] of guess ids by the time they are guessing

        console.debug(`Guesses.addGuess (date: ${dt}, numbers: ${numbers})`);

        // Build the guess data object
        const id = uuid();
        if (dt === null || dt === undefined) 
            dt = new Date().setSeconds(0, 0) + 60000
        else
            dt = new Date(dt).setSeconds(0, 0)
            
        // Date must be in the future
        if (dt < new Date().setSeconds(60, 0)) {
            console.log(`Date ${dt} is in the past`);
            return null;
        }

        // Set up the data to be saved...
        const key = `guess:${id}`;
        const numbersKey = `${key}.numbers`;
        const dateIndex = `guess.date.index`;
        const guess = {
            "id": id,
            "for_date": dt.valueOf(),
        };


        // Try setting has with "guess:id"
        const didset = new Promise((resolve, reject) => {
            this.client.hsetnx(key, "id", id, (err, res) => {
                if (err) {
                    console.warn(`Error placing guess for ${JSON.stringify(guess)}`, err);
                    reject(err);
                }
                else if (res === 0) {
                    console.log(`Existing guess cannot be modified. Try deleting and resumbitting`);
                    reject(`A duplicate guess already exists for this id (${id}). Try resumbiting`);
                }
                else if (res === 1) {
                    // this is a new guess
                    console.debug(`Guesses.addGuess: New guess id ${id} with ${numbers} for ${dt}`);
                    this.client.multi()
                        .hmset(key, guess)
                        .sadd(numbersKey, numbers)
                        .zadd(dateIndex, dt, key)
                        .exec( (err, res) => {
                            if (err) {
                                console.warn(`Error placing guess for ${JSON.stringify(guess)}`, err);
                                reject(err);
                            } else {
                                console.log(`Successfully saved new guess ${res}`);
                                resolve({
                                    ...guess, 
                                    "for_date": new Date(guess.for_date),
                                    numbers
                                });
                            }
                        });
                }
            })
        });

        return await didset;
    };

    async getGuessById (id) {        
        // console.debug(`Guesses.getById (id: ${id})`);
        const key = `guess:${id}`;
        const numbersKey = `${key}.numbers`;

        const rval = new Promise((resolve, reject) => {
            this.client.multi()
            .hgetall(key)
            .smembers(numbersKey)
            .exec((err, res) => {
                if(err) {
                    console.warn(`Error getting guess for ${id}`, err);
                    reject(err);
                } else {
                    if (res === null || res[0] === null) {
                        console.log(`Guess was not found for id ${id} with key ${key}`);
                        resolve(null);
                    } else {
                        console.debug(`Found guess: ${res[0].id} for ${res[0].for_date} with numbers ${res[1]}`);
                        resolve({
                            ...res[0], 
                            for_date: parseInt(res[0].for_date), 
                            numbers: res[1].map(m => parseInt(m))
                        });
                    }
                }
            })
        });

        return await rval;
    };

    async updateGuessValues(id, values) {
        // console.debug(`Datastore::updateGuessValues (id: ${id}, values: ${values})`);
        const key = `guess:${id}`;
        const numbersKey = `${key}.numbers`;

        const rval = new Promise((resolve, reject) => {
            this.client.hgetall(key, (err, guess) => {
                if(err) { 
                    console.warn(`Datastore: Error updating guess for ${id}`. err); 
                    reject(err);
                } else {
                    const for_date = new Date(parseInt(guess.for_date));
                    if (for_date <= Date.now()) {
                        console.log(`Datastore: Attempt to update a guess in the past. ${for_date} < ${Date.now()}`);
                        reject('Cannot update a guess with a draw date in the past');
                    } else {
                        // looks OK - update the numbers...
                        this.client.multi()
                            .del(numbersKey)
                            .sadd(numbersKey, values)
                            .exec((err, res) => {
                                if(err) {
                                    console.warn(`Datastore: Error updating guess numbers for ${numbersKey}`, err);
                                    reject(err);
                                } else {
                                    console.debug(`Datastore: Updated ${numbersKey} for ${guess.for_date} to ${values}`);
                                    resolve({
                                        ...guess, 
                                        for_date: parseInt(res[0].for_date), 
                                        numbers: values.map(m => parseInt(m))
                                    });
                                }
                            })
                    }
                }
            })
        });

        return await rval;

    }

    async deleteGuessById (id) {
        // console.debug(`Datastore::deleteGuessById (id: ${id})`);

        const guess = await(this.getGuessById(id));
        if (guess === null || guess === undefined) {
            return false;
        }

        const key = `guess:${id}`;
        const numbersKey = `${key}.numbers`;
        const dateIndex = `guess.date.index`;

        this.client.multi()
            .del(key)
            .del(numbersKey)
            .zrem(dateIndex, key)
            .exec();

        console.debug(`Datastore: deleted guess ${key}`);

        return true;
    };

    
    async getGuessesByDate (dt) {
        console.debug(`Datastore::getGuessesByDate(${dt})`);

        const dateIndex = 'guess.date.index';
        let rval = new Promise((resolve, reject) => {
            const fromdt = new Date(dt).valueOf();
            const todt = fromdt;
            this.client.zrangebyscore(dateIndex, fromdt, todt, (err, res) => {
                if (err) {
                    console.warn(`Datastore: Error updating guess numbers for ${numbersKey}`, err);
                    reject(err);
                } else {
                    console.debug(`Datastore found ${res.length} guesses for date ${dt}`);
                    resolve(res);
                }
            })
        });

        return await rval;
    }

    async getGuessResultsByDate (draw_date) {
        const dt = new Date(draw_date);
        const id = dt.setSeconds(0, 0).valueOf();   // unix time to the minute
        const resultNumbersKey = `numbers:${id}`;
        const dateIndex = `guess.date.index`;

        if (!this.client.exists(resultNumbersKey)) {
            console.debug(`datastore::getWinnersByDate: no results for date ${draw_date}`);
            return [];
        }

        let rval = new Promise((resolve, reject) => {
            const fromdt = id;
            const todt = fromdt;
            this.client.zrangebyscore(dateIndex, fromdt, todt, (err, guesses) => {
                if (err) {
                    console.warn(`Datastore: Error getting guesses in date range ${fromdt}..${todt}`, err);
                    reject(err);
                } else {
                    console.debug(`Datastore checking ${guesses.length} guesses for winners for date ${dt}`);
                    const batch = this.client.batch();
                    for (const g of guesses) {
                        const guessNumberKey = `${g}.numbers`;
                        batch.echo(g);
                        batch.sinter(resultNumbersKey, guessNumberKey);
                    }
                    batch.exec((err,inter) => {
                        if (err) {
                            console.warn(`Datastore: Error getting winners using intersections`, err);
                            reject(err);
                        } else {
                            let rval = inter.reduce( (acc, val, idx) => { 
                                if (idx % 2 == 0) return [ ...acc, { "guess": val } ]; 
                                acc[acc.length - 1].matches = val; 
                                return acc 
                            }, [] );
                            console.debug(`Datastore: results for ${draw_date}:`, rval);
                            resolve(rval);
                        }
                    })
                }
            })
        });

        return await rval;

    }


    
    // scanOldKeys(cursor, oldest) {
    //     this.client.scan(cursor, "MATCH", "number:*", (err, res) => {
    //         if (!err) {
    //             cursor = res[0];
    //             var toDelete = res[1].filter(n => n < oldest);
    //             console.debug(`- REDIS key scan delete ${toDelete.length} of ${res[1].length}, next: ${cursor}`);

    //             if (toDelete.length > 0) this.client.del(toDelete);
    //             if (cursor != 0) this.scanOldKeys(cursor, oldest);
    //         }
    //     })
    // }

    initRedisStore() {
    }

    cleanupDb() {
        console.info(`Datastore cleanup triggered`);
        
        // Maintain the size of the date index
        // this.client.zcard("number.date.index", (err, zsize) => {
        //     if (err) {
        //         console.warn("REDIS error cleaning up: ", err);
        //     } else {
        //         console.debug(`- number.date.index has ${zsize} items`);
        //         if (zsize > REDIS_MAX_NUMBERS) {
        //             console.info(`- numbers.date.index: removing ${zsize - REDIS_MAX_NUMBERS} items`);
        //             this.client.zremrangebyrank("number.date.index", 0, zsize - REDIS_MAX_NUMBERS - 1);
        //         }
        //     }
        // });

        // Clear old hashes (anything not in the index)
        // this.client.zrange("number.date.index", 0, 0, (err, lastkey) => {
        //     if (err) {
        //         console.warn("REDIS error cleaning up numbers: ", err);
        //     } else {
        //         console.debug(`- ${lastkey} is last key in number.date.index`);
        //         this.scanOldKeys(0, lastkey);
        //     }
        // })
    }


}

// export a singleton
module.exports = Datastore;
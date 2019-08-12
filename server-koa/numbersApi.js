// NumbersStore
// - uses a REDIS store to manage lucky numbers, passed in the constructor
//
// Random numbers are added periodically by the app. Only one number may be added per interval.
// Clients will often GET recent values for history
// Clients will sometimes GET by date (to check winners in a timeframe)
// 
// First thoughts: 
// - HASH could store complex guess object information (if we need it)
// - LIST would keep recent values
// - ZSET could keep a date-index, which could also manage recent values
//
// Approach:
// - SET a HASH for each generated number (number:unixtime)
// - ZSET [number.date.index] to search and retrieve by date
// 

const crypto = require('crypto');

const REDIS_MAX_NUMBERS = 10080; // 1 week of 1 minute data
// const REDIS_MAX_NUMBERS = 25;


class NumbersAPI {
    constructor (client) {
        this.version = 0.2;
        this.redisclient = client;
    }

    ready() {
        return this.redisclient.ready;
    }

    async addRandomValue() {
        const newVal = crypto.randomBytes(1).readUInt8(0) % 100 + 1;
        const newObj = await this.addValue(new Date(), newVal);

        return newObj;
    }

    async addValue(date, val) {
        if (!this.redisclient || !this.redisclient.ready) return null;

        const dt = new Date(date);
        // dt.setSeconds(0, 0);
        const id = dt.setSeconds(0, 0).valueOf();
        const newValueObj = {
            id: id,
            key: `number:${id}`,
            date: dt,
            value: val,
        };

        // if an entry already exists, return that (and ignore this value)
        const rval = new Promise((resolve,reject) => {
            this.redisclient.hsetnx(newValueObj.key, "id", newValueObj.id, (err,res) => {
                if (err) {
                    console.warn(`Error adding value to Redis: ${err}`);
                    reject(err);
                } else {
                    if (res == 0) {
                        // already exists
                        console.debug(`Number addValue - already exists for this time`);
                        resolve(null);
                    } else {
                        this.redisclient.multi()
                            .hmset(newValueObj.key, newValueObj)
                            .zadd("number.date.index", dt.valueOf(), newValueObj.key)
                            .exec( (err, mres) => {
                            if (err) {
                                console.warn(`ERROR adding number to REDIS: ${err}`);
                                reject(err);
                            } else {
                                console.log(`Numbers: added ${JSON.stringify(newValueObj)} [${mres}]`)
                                resolve(newValueObj);
                            }
                        });
        
                    }
                }
            });
        });
                            
        return await rval;
    }

    async getDate(date) {
        const dt = new Date(date);
        dt.setSeconds(0, 0);
        const key = `number:${dt.valueOf()}`;
        const rval = new Promise((resolve, reject) => {
            this.redisclient.hgetall(key, (err, response) => {
                if (err) {
                    console.error(`ERROR getting number by date: ${err}`);
                    reject(err);
                } if (response) {
                    console.debug(`Number fetched key ${key} => ${response.value}`);
                    resolve(response);
                } else {
                    console.debug(`No number found with key ${key}`);
                    resolve(null);
                }
            })
        });

        return await rval;
    }

    async getLastN(n) {
        const rval = new Promise((resolve, reject) => {
            this.redisclient.zrevrange("number.date.index", 0, n - 1, (err, rsp) => {
                if (err) {
                    console.error(`ERROR getting last ${n} numbers: ${err}`);
                    reject(err);
                } else {
                    console.debug(`Last ${n} numbers returned ${rsp.length} keys`);
                    
                    // map the response array to number base objects
                    const batch = this.redisclient.batch();
                    for (var r in rsp) {
                        batch.hgetall(rsp[r])
                    }
                    batch.exec((err, response) => {
                        if (err) {
                            console.warn(`ERROR getting batch of recent numbers ${err}`);
                            reject(err);
                        } else {
                            console.debug(`Last ${n} batch returned ${response.length} objects`);
                            resolve(response);
                        }
                    });
                }
            })
        });

        return await rval;
    }
    
    scanOldKeys(cursor, oldest) {
        this.redisclient.scan(cursor, "MATCH", "number:*", (err, res) => {
            if (!err) {
                cursor = res[0];
                var toDelete = res[1].filter(n => n < oldest);
                console.debug(`- REDIS key scan delete ${toDelete.length} of ${res[1].length}, next: ${cursor}`);

                if (toDelete.length > 0) this.redisclient.del(toDelete);
                if (cursor != 0) this.scanOldKeys(cursor, oldest);
            }
        })
    }

    cleanupDb() {
        console.info(`Numbers DB cleanup triggered`);
        
        // Maintain the size of the date index
        this.redisclient.zcard("number.date.index", (err, zsize) => {
            if (err) {
                console.warn("REDIS error cleaning up: ", err);
            } else {
                console.debug(`- number.date.index has ${zsize} items`);
                if (zsize > REDIS_MAX_NUMBERS) {
                    console.info(`- numbers.date.index: removing ${zsize - REDIS_MAX_NUMBERS} items`);
                    this.redisclient.zremrangebyrank("number.date.index", 0, zsize - REDIS_MAX_NUMBERS - 1);
                }
            }
        });

        // Clear old hashes (anything not in the index)
        this.redisclient.zrange("number.date.index", 0, 0, (err, lastkey) => {
            if (err) {
                console.warn("REDIS error cleaning up numbers: ", err);
            } else {
                console.debug(`- ${lastkey} is last key in number.date.index`);
                this.scanOldKeys(0, lastkey);
            }
        })
        
    }


}

// export a singleton
module.exports = NumbersAPI;
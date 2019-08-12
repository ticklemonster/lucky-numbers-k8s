// GUESSES
// - stores guesses as separate keys in a Redis store
//// 
// REDI implementation: 
//  - Store each guess as a Hash [guess:id]
//  - Keep one SET for each possible number (100 sets) and add Guesses to the [guess.value=n] SET
//      (since there are only a limited number of numbers - really easy to lookup)
//
// TODO: Consider storing Guesses in a sorted set (Z) - with "value" as score?
//  - Keep a second SORTED SET sorting Guesses by value [guess.value.index]
//      (best if numbers were continuous or large in number)
// 

const uuid = require('uuid/v4');  // random UUIDs
const {promisify} = require('util');

class GuessesApi {
    constructor(client) {
        this.version = '0.1';
        this.redis = client;
    };

    ready() {
        return this.redis.ready;
    }

    async addGuess (id, value) {
        // console.debug(`Guesses.addGuess (id: ${id}, value: ${value})`);
        const _hsetnx = promisify(this.redis.hsetnx).bind(this.redis);
        const _hget = promisify(this.redis.hget).bind(this.redis);

        // Build the guess data object
        if (id === null || id === undefined) id = uuid();
        const key = `guess:${id}`;
        const guess = {
            "id": id,
            "date": new Date(),
            "value": value
        };

        // Try setting has with "guess:id"
        const didset = await _hsetnx(key, "id", id);
        if (didset == 0) {
            // this key already exists - it's an update...
            const oldval = (await _hget(key, "value"));
            console.debug(`Guesses.addGuess: Update guess ${id} from ${oldval} to ${value}`);
            this.redis.multi()
                .hmset(key, guess)
                .srem(`guess.value:${oldval}`, key)
                .sadd(`guess.value:${value}`, key)
                .exec();
        } else {
            // this is a new guess
            console.debug(`Guesses.addGuess: New guess id ${id} value ${value}`);
            this.redis.multi()
                .hmset(key, guess)
                .sadd(`guess.value:${value}`, key)
                .exec();
        }

        return guess;
    };

    async getById (id) {        
        // console.debug(`Guesses.getById (id: ${id})`);
        const hgetall = promisify(this.redis.hgetall).bind(this.redis);

        const key = 'guess:' + id;
        const rval = await hgetall(key)
        console.debug(`Guesses.getId (id: ${id}) => `, rval);

        return rval;
    };

    async deleteById (id) {
        // console.debug(`Guesses.deleteById (id: ${id})`);
        const _del = promisify(this.redis.del).bind(this.redis);
        const _hgetall = promisify(this.redis.hgetall).bind(this.redis);

        try {
            const key = 'guess:' + id;
            const rval = await _hgetall(key);
            if (rval === null) throw('Guess not found');

            this.redis.multi()
                .del(key)
                .srem(`guess.value:${rval.value}`, key)
                .exec();

        } catch (err) {
            console.warn(`Error deleting guess with id ${id}.`, err);
            return false;
        }

        return true;
    };

    async getByValue (value) {
        // console.debug(`Guesses.byValue(${value})`);
        const _smembers = promisify(this.redis.smembers).bind(this.redis);
        var keyset = `guess.value:${value}`;

        var rval = await _smembers(keyset);
        return rval;
    }

}

module.exports = GuessesApi;
// app.js
// - runs the API server, based on KOA
//
// The app provides:
// - RESTFUL API from app.js
// - A scheduled number generator that creates new numbers and posts the results
//
// It depends on:
// - A REDIS store for storing numbers and guesses (if this isn't found, it will resort to a local cache)
//   environment: REDIS_URL
// - A MQTT messaging system for pushing notifications (if this isn't found, it will only log notifications)
//   environment: BROKER_URL

const Koa = require('koa');
const parse = require('co-body');
const route = require('koa-route');
const redis = require('redis');
const mqtt = require('mqtt');

const NumbersAPI = require('./numbersApi');
const GuessesAPI = require('./guessesApi');

// Environment variables for configuration
const GENERATE_INTERVAL = process.env.GENERATE_INTERVAL || 1; // number generation interval in MINS
const REDIS_URL = process.env.REDIS_URL;
const BROKER_URL = process.env.BROKER_URL;

// Constants
const LUCKYNUMBERS_COOKIE_ID = 'luckynumbers:id'

// Global 
const app = new Koa();

// REDIS CONNECTION 
// connect to redis at the app level
// services can share this connection and its retry strategy
app.context.dbclient = redis.createClient({
  url: REDIS_URL,
  retry_strategy: (opts) => {
    // Retry forever with back-off
    console.warn(`WARNING: REDIS connection offline - retry #${opts.attempt}`);
    return Math.min(opts.attempt * 1000, 10000); // backoff to no more than 10sec
  }
})
app.context.dbclient
  .on("error", (err) => {
    console.error(`ERROR from REDIS: ${err}`);
  })
  .on("ready", () => {
    console.log(`App is ready to use Redis ${REDIS_URL || "(local)"}`);
    randomNumberGenerator(app.context);

    // Run the RNG 
    randomNumberGenerator(app.context);

    // Set DB cleanup to run every 15 periods (at any offset, whenever)
    app.context.timer_dbclean = setInterval(databaseCleanup, 59 * GENERATE_INTERVAL * 60 * 1000, app.context);

  })
  .on("reconnect", () => {
    console.log(`App is disconnected from Redis`);
  });


// MQTT CONNECTION
// the app manages the MQTT connection directly
app.context.mqclient  = mqtt.connect(BROKER_URL);
app.context.mqclient
  .on('connect', function () {
    console.log(`Connected to MQTT at ${BROKER_URL}`);
  })
  .on('message', function (topic, message) {
    // message is Buffer
    console.log(`MQ Message on ${topic}: ${message.toString()}`);
  })
  .on('offline', function () {
    console.log(`MQ Connection is OFFLINE`);
  })
  .on('error', function(error) {
    console.error(`MQ error: ${err}`);
  });


//
// First stage server handler - mark server not ready if REDIS is not connected
app.use (async (ctx, next) => {
  if( ctx.dbclient.connected )
    await next()
  else
   ctx.throw(503, "Server is not ready");
});

//
// NUMBERS API
// -----------
// GET /api/numbers - returs last number, or use ?length=x to return last x numbers
// GET /api/numebrs/:timestamp - returns the number from a given timestamp (unix epoch)
//
    

// GET last number (or last "length" numbers)
app.use(route.get('/api/numbers', async ctx => {
  console.log('GET /api/numbers', ctx.query);
  const length = parseInt(ctx.query['length']) || 1;
  ctx.response.type = 'application/json';
  ctx.response.body = { 'numbers':  await ctx.numbers.getLastN(length) };
}));

// GET number from a specified timestamp
app.use(route.get('/api/numbers/:timestamp', async (ctx, tsstr) => {
    const tsmsec = parseInt(tsstr);
    const timestamp = (tsmsec == tsstr) ? new Date(tsmsec) : new Date(tsstr);
    console.log(`GET /api/numbers/${tsstr} => numbers:${timestamp.valueOf()}`);

    if (timestamp == 'Invalid Date') {
        ctx.throw(400, `Date supplied in /api/numbers is not valid. ${tsstr}`);
        return;
    }

    // console.log(`Get number at timestamp: ${timestamp.valueOf()} (${timestamp.toISOString()})`);
    ctx.response.type = 'application/json';
    ctx.response.body = { 'numbers': [ await ctx.numbers.getDate(timestamp) ] }; 
}));


//
// GUESSES API
// -----------
// POST /api/guesses - make a guess (with a JSON body containing a "value")
//   if an "id" is not provided in body or cookie, a random one will be generated
//   sets a cookie with the id
// GET /api/guesses - gets a guess if there is an id in the cookie
// GET /api/guesses/:id - return the guess with a given id
// PUT /api/guesses/:id - update a guess with the given id (must have a "value")
// DELETE /api/guesses/id - remove an id

// POST a guess - requires a body with "name" and "number"
app.use(route.post('/api/guesses', async ctx => {
  try {
    // try to parse the body
    const body = await parse(ctx);
    console.log("POST /api/guesses with: ", body);
    
    // must have a number
    const value = parseInt(body['value']) || undefined;
    if( value === undefined) {
      throw new Error('POST guess requires a JSON body with "{ value: <value> }"');
    }

    // place the new guess
    const id = body['id'] || ctx.cookies.get(LUCKYNUMBERS_COOKIE_ID) || null;
    const rval = await ctx.guesses.addGuess(id, value);
    rval.ref = encodeURI(`/api/guesses/${rval.id}`);
    
    ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID, rval.id);
    ctx.response.body = rval;
  }
  catch (err) {
    console.error(`GUESS ERROR: ${err}`);
    ctx.throw(400, `Unable to parse post data: ${err}`);
    return;
  }
}));

// GET an existing guess with a cookie
app.use(route.get('/api/guesses', async ctx => {
  const id = ctx.cookies.get(LUCKYNUMBERS_COOKIE_ID);
  if (id !== undefined) {
    console.log(`redirecting /api/guesses with cookie to /api/guesses/${id}`);
    ctx.redirect(`/api/guesses/${id}`);
  } else {
    ctx.throw(400, 'GET a guess requires an ID');
  }
}));

// GET an existing guess with an id
app.use(route.get('/api/guesses/:id', async (ctx, id) => {
  const rval = await ctx.guesses.getById(id);
  if (rval === undefined) {
    // No guess found with this ID
    ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID, null);
    ctx.throw(404);
    return null;
  }

  ctx.response.body = rval;
}));

// PUT an updated value for a guess with an id
app.use(route.put('/api/guesses/:id', async (ctx, id) => {
  const guess = await ctx.guesses.getById(id);
  if (guess === undefined) {
    console.debug(`Update guesses with id ${id} - not found`);
    ctx.throw(404, `No Guess with id ${id} found`);
    return;
  }

  try {
    const body = await parse(ctx.request);
    if (!body.value)  throw new Error('Value is required in PUT body');
    
    const newval = parseInt(body.value);
    if (!newval || isNaN(newval)) {
      throw new Error('Value must be an integer');
    }
    if (newval < 1 || newval > 100) {
      throw new Error('Value must be between 1 and 100');
    }

    console.debug(`Updating guess with id ${id} from ${guess.value} to ${newval}`);

    const rval = await ctx.guesses.addGuess(id, newval);
    rval.ref = encodeURI(`/api/guesses/${rval.id}`);
    ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID, id);
    ctx.response.body = rval;
  }
  catch (err) {
    console.debug(`PUT guesses with id ${id} error ${err}`);
    ctx.throw(400, err);
  }
  
}));

// DELETE a guess with a given id
app.use(route.delete('/api/guesses/:id', async (ctx, id) => {
  const rval = await ctx.guesses.deleteById(id);

  if (rval) {
    ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID);
    ctx.response.status = 200;
  } else {
    ctx.throw(404, `Id ${id} not found to delete`);
  }
}));


//
// Random number generation - runs periodically
async function randomNumberGenerator(ctx) {
  try {
      const newnumobj = await ctx.numbers.addRandomValue ();
      if (newnumobj !== null) {
        ctx.mqclient.publish('numbers', JSON.stringify({ "action": "NEW_NUMBER", "number": newnumobj }));    
        
        const winners = await ctx.guesses.getByValue(newnumobj.value);
        if (winners !== null && winners.length > 0) {
          console.debug(`Got winners! `, winners);
          ctx.mqclient.publish('numbers', JSON.stringify({"action": "WINNERS", "guesses": winners}));
        }
      }
  } catch (err) {
    console.warn(`RandomNumberGenerator error: ${err}`);
  }

  // rescheduule for the nex minute 
  const msToNextMin = new Date().setSeconds(0, 0) + 60000 - (new Date());
  ctx.timer_rng = setTimeout(randomNumberGenerator, msToNextMin, ctx);
};

function seedRandomNumbers() {
  // seed the numbers store - uses Math.random() not crypto, but good enough for filling out
  console.log('- seeding Redis with 100 random numbers');
  const dt = (new Date()).setSeconds(0, 0);
  for (var n = 0; n < 100; n++) {
      app.context.numbers.addValue(
        dt - (GENERATE_INTERVAL * 60 * 1000 * n),
        parseInt(Math.random() * 100) + 1
      );
  }
}



// Database cleanup - scheduled periodically
async function databaseCleanup(ctx) {
  ctx.numbers.cleanupDb();
}


//
// INITIALISATION PROCESS FOR THE APP
//
// const myUuid = require('os').hostname();
app.context.numbers = new NumbersAPI(app.context.dbclient);
app.context.guesses = new GuessesAPI(app.context.dbclient);

app.on('close', () => {
  console.debug('--- APP SHUTDOWN ---');
  console.debug('- Stopping timers...');
  if (app.context.timer_rng) clearInterval(app.context.timer_rng);
  if (app.context.timer_dbclean) clearInterval(app.context.timer_dbclean);
  console.debug(`- Closing MQ connection to ${app.context.mqclient.options.href}...`);
  app.context.mqclient.end();
  console.debug(`- Closing REDIS connection to ${app.context.dbclient.options.url}...`);
  app.context.dbclient.end(true);
  console.debug('---   APP DOWN   ---');
});



module.exports = app;
// app.js
// - runs the API server, based on KOA
//
// The app provides:
// - RESTFUL API from app.js
// - A scheduled number generator that draws new numbers and posts the results
//  The system will draw numbers like a lottery:
//  every PICK_MINS, choose PICK_NUMBERS numbers from a range of PICK_RANGE_FROM...PICK_RANGE_TO
//  By default: pick 6 number from 1..45, every minute
//
// It depends on:
// - A Datastore for storing numbers and guesses (if not found, the server will exit)
//   environment: REDIS_URL 
// - A Messaging system for pushing notifications (if this isn't found, it will only log notifications)
//   environment: BROKER_URL

const Koa = require('koa');
const parse = require('co-body');
const route = require('koa-route');
const crypto = require('crypto');

const Datastore = require('./datastore-redis');
const Messaging = require('./messaging-mqtt');

// Environment variables for configuration
const REDIS_URL = process.env.REDIS_URL;
const BROKER_URL = process.env.BROKER_URL;

// Environment variables to override the game configuration
// Lottery style: 
const PICK_MINS = process.env.PICK_MINS || 1; // number generation interval in MINS
const PICK_RANGE_FROM = process.env.PICK_RANGE_FROM || 1;
const PICK_RANGE_TO = process.env.PICK_RANGE_TO || 45;
const PICK_NUMBERS = process.env.PICK_NUMBERS || 6; 

// Constants
const LUCKYNUMBERS_COOKIE_ID = 'luckynumbers:id'

// Global 
const app = new Koa();
app.context.datastore = new Datastore(REDIS_URL);
app.context.messaging = new Messaging(BROKER_URL);

//
// First stage server handler - mark server not ready if REDIS is not connected
app.use (async (ctx, next) => {
  if( ctx.datastore.ready() )
    await next()
  else
   ctx.throw(503, "Server is not ready");
});

//
// NUMBERS API
// -----------
// GET /api/results - returs last number, or use ?length=x to return last x numbers
// GET /api/numebrs/:timestamp - returns the number from a given timestamp (unix epoch)
//
// GET last number (or last "length" numbers)
app.use(route.get('/api/results', async ctx => {
  console.log('GET /api/results', ctx.query);
  const length = parseInt(ctx.query['length']) || 1;
  // ctx.response.type = 'application/json';

  let rval = await ctx.datastore.getLastNResults(length);
  rval = rval.map(n => ({...n, "ref": `/api/results/${n.id}` }));

  ctx.response.body = { "results": rval };
}));

// GET number from a specified timestamp
app.use(route.get('/api/results/:timestamp', async (ctx, tsstr) => {
    const tsmsec = parseInt(tsstr);
    const timestamp = (tsmsec == tsstr) ? new Date(tsmsec) : new Date(tsstr);
    console.log(`GET /api/results/${tsstr} => numbers:${timestamp.valueOf()}`);

    if (timestamp == 'Invalid Date') {
        ctx.throw(400, `Date supplied in /api/results is not valid. ${tsstr}`);
        return;
    }

    // console.log(`Get number at timestamp: ${timestamp.valueOf()} (${timestamp.toISOString()})`);
    ctx.response.type = 'application/json';
    let rval = await ctx.datastore.getResultsByDate(timestamp);
    rval.ref = `/api/results/${rval.id}`;
    ctx.response.body = { 'results': [ rval ] }; 
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

// POST a new guess - requires a body with "numbers"
app.use(route.post('/api/guesses', async ctx => {
  try {
    // try to parse the body
    const body = await parse(ctx);
    console.log("POST /api/guesses with: ", body);
    
    // must have a set of numbers
    let numbers = body['numbers']|| undefined;
    if (numbers === undefined || !Array.isArray(numbers)) {
      ctx.throw(400, 'POST guess requires a JSON body with an array of numbers "{ numbers: [...] }"');
      return;
    }

    // must be at least PICK_NUMEBRS numbers selected (extra numbers mean more guesses - "system" pick)
    numbers = numbers.map(n => parseInt(n));
    if (new Set(numbers).length < PICK_NUMBERS) {
      ctx.throw(400, `POST guess requires at least ${PICK_NUMBERS} unique numbers`);
      return;
    }

    // place the new guess
    const date = body['date'] || null;
    const rval = await ctx.datastore.addGuess(date, numbers);
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
  console.debug(`GET /api/guesses/${id}`);

  try {
    const rval = await ctx.datastore.getGuessById(id);
    if (rval === undefined || rval === null) {
      // No guess found with this ID
      ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID, null);
      ctx.throw(404);
      return null;
    }
    
    if (rval.for_date < Date.now()) {
      console.debug(`GET /api/guesses/${id} - should have results`);
      const results = await ctx.datastore.getResultsByDate(rval.for_date);
      if (results) {
        rval.results = `/api/results/${results.id}`
      }
    }
    
    ctx.response.body = rval;
    
  } catch (err) {
    ctx.throw(500, err);
  }

}));

// PUT an updated value for a guess with an id
app.use(route.put('/api/guesses/:id', async (ctx, id) => {
  console.debug(`PUT /api/guesses/${id}`);

  try {
    const guess = await ctx.datastore.getGuessById(id);
    const body = await parse(ctx.request);

    if (guess === undefined) {
      console.log(`Update guesses with id ${id} - not found`);
      ctx.throw(404, `No guess found with id ${id}`);
      return;
    }
    if (guess.for_date < Date.now()) {
      console.log(`Cannot update a guess that has already been drawn ${guess.for_date} > ${Date.now()}`);
      ctx.throw(400, `Cannot update a guess with a draw date in the past`);
      return;
    }

    
    // must have a set of numbers
    let numbers = body['numbers']|| undefined;
    if (numbers === undefined || !Array.isArray(numbers)) {
      ctx.throw(400, 'PUT guess requires a JSON body with an array of numbers "{ numbers: [...] }"');
      return;
    }

    // must be at least PICK_NUMEBRS numbers selected (extra numbers mean more guesses - "system" pick)
    numbers = numbers.map(n => parseInt(n));
    if (new Set(numbers).length < PICK_NUMBERS) {
      ctx.throw(400, `PUT guess requires at least ${PICK_NUMBERS} unique numbers`);
      return;
    }
    
    console.debug(`Try to update guess with id ${guess.id} from ${guess.numbers} to ${numbers} for draw at ${guess.for_date}`);

    const rval = await ctx.datastore.updateGuessValues(id, numbers);
    rval.ref = encodeURI(`/api/guesses/${rval.id}`);
    ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID, id);
    ctx.response.body = rval;
  }
  catch (err) {
    console.debug(`PUT guesses with id ${id} error ${err}`);
    ctx.throw(500, err);
  }
  
}));

// DELETE a guess with a given id
app.use(route.delete('/api/guesses/:id', async (ctx, id) => {
  try {
    const rval = await ctx.datastore.deleteGuessById(id);
    if (rval) {
      ctx.cookies.set(LUCKYNUMBERS_COOKIE_ID);
      ctx.response.status = 200;
    } else {
      ctx.throw(404, `Id ${id} not found to delete`);
    }
  } catch (err) {
    ctx.throw(500, err);
  }

}));


app.use(route.get('/api/generate', async (ctx) => {
  const apiKey = ctx.headers["x-api-key"] || ctx.cookies.get("x-api-key");
  if ("SECRETSQUIRREL" !== apiKey) {
    ctx.throw(401, `X-API-Key is requried`);
  }
  else
  {
    console.debug(`${new Date()} - GENERATE called with valid key`);
    const newnumobj = await pickNumbers (ctx);
    ctx.body = newnumobj;
    ctx.response.status = 200;
  }
}))

//
// Random number generation - runs periodically
//
function scheduleNextDraw(ctx) {
  // rescheduule for the next minute 
  const timeNow = new Date();
  const msToNextDraw = PICK_MINS * 60000 - timeNow.getSeconds() * 1000 - timeNow.getMilliseconds();
  ctx.timer_rng = setTimeout(pickNumbers, msToNextDraw, ctx);

  console.debug(`> Next draw in ${msToNextDraw}ms <`);
}

async function pickNumbers(ctx) {
  // do NOT use Redis random because they may not be very random
  // use Crypto library
  
  // build the array for picking numbers
  let s = [], w = [];
  for (let i = PICK_RANGE_FROM; i <= PICK_RANGE_TO; i++) {
    s.push(i);
  }

  // draw the random numbers...
  const drawDate = new Date();
  const r = crypto.randomBytes(PICK_NUMBERS);
  for (let j = 0; j < PICK_NUMBERS; j++) {
    const rj = r.readUInt8(j) % s.length;
    const rn = s.splice(rj, 1);
    w = w.concat(rn);
  }

  try {
    // Try saving the results to the datastore
    const resultsObj = await ctx.datastore.addResults(drawDate, w);
    if (resultsObj !== null) {
      console.debug(`New number draw: ${JSON.stringify(resultsObj)}`);
      ctx.messaging.sendMessage('numbers', JSON.stringify({
        "action": "NEW_DRAW_RESULTS", 
        "results": resultsObj 
      }));    
      
      // Check for winners
      const results = await ctx.datastore.getGuessResultsByDate(resultsObj.date);
      const winners = results.filter(r => r.matches.length > PICK_NUMBERS / 2);
      console.debug(`current draw had ${winners.length} winners from ${results.length} entries`);
      
      results.forEach(r => {
        if (r.matches.length > PICK_NUMBERS/2) 
          console.debug(`WINNER - Guess ${r.guess} got ${r.matches.length} of ${PICK_NUMBERS}`);

        const resultMessage = {
          "action": "GUESS_RESULTS",
          "date": resultsObj.date,
          "guess": r.guess.split(':')[1],
          "matches": r.matches,
          "prize": (r.matches.length > PICK_NUMBERS / 2) ? `${r.matches.length} of ${PICK_NUMBERS}` : 'none',
        };          ;
        ctx.messaging.sendMessage(`guess/${resultMessage.guess}`, JSON.stringify(resultMessage));
      })
    }
  } catch (err) {
    console.warn(`pickNumbers error: ${err}`);
  }

  scheduleNextDraw(ctx);
};

scheduleNextDraw(app.context);

//
// INITIALISATION PROCESS FOR THE APP
//

app.on('close', () => {
  console.debug('--- APP SHUTDOWN ---');
  console.debug('- Stopping timers...');
  if (app.context.timer_rng) {
    clearInterval(app.context.timer_rng);
    app.context.timer_rng = null;
  } 
  if (app.context.messaging) {
    console.debug(`- Closing messaging...`);
    app.context.messaging.broadcast('SHUTDOWN');
    app.context.messaging.close();
  }
  if (app.context.datastore) {
    console.debug(`- Closing datastore...`);
    app.context.datastore.close();
  }
  console.debug('---   APP DOWN   ---');
});

module.exports = app;
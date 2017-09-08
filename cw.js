'use latest';
// FILE
//   cw.js
// OVERVIEW
//   If the temperature is below the air conditioner's setpoint,
//   having the windows open is good.  Otherwise, not.
//   So: If the locale's temperature rises above the setpoint, send a
//   text message ("Close the windows!").  If it drops below that,
//   send an email.
// DEPLOY
//   wt cron schedule --secrets-file=cw-secrets.env 15m ./cw.js

// The following need to be defined in context.secrets:
// API keys:
//   WUNDERGROUND_KEY
//   SENDGRID_KEY
//   TEXTBELT_KEY
// Parameters:
//   LOCALE  -- eg "OH/Podunk"
//   SET_POINT  -- eg "74"
//   SMS_DEST -- eg "5551112222"
//   EMAIL_DEST  -- eg "bob@example.com"
//   EMAIL_SRC  -- eg "alice@example.org"

//require('es6-promise').polyfill();
require('isomorphic-fetch');
const querystring = require('querystring');

///////////////////////////////////////////////////////////////////////////////

module.exports = function( ctx, cb ) {
  if (!ctx) { return testingAccess(); }
  getTemp( ctx.secrets.LOCALE, getPrevTemp, logFail, ctx );
  cb( null, "dispatched" );
};

///////////////////////////////////////////////////////////////////////////////

function logFail( name, errorItem ) {
    console.log( "***", name, "fail -- error:",  errorItem );
}
function logNormal( name, logItem ) {
    console.log( "//", name, "--", logItem );
}
///////////////////////////////////////////////////////////////////////////////

function compareTemps( prevTemp, currTemp, ctx ) {
  console.log( "prev temp:", prevTemp, "curr temp:", currTemp );    
  const Setpoint = ctx.secrets.SET_POINT;
  const prev = parseFloat(prevTemp);
  const curr = parseFloat(currTemp);
  const smsDest = ctx.secrets.SMS_DEST;
  const emailDest = ctx.secrets.EMAIL_DEST;
  const emailSrc = ctx.secrets.EMAIL_SRC;   
  if ( prev <= Setpoint && curr > Setpoint ) {
    console.log( "sending sms..." );
    const msg = `close the windows! prev=${prev},curr=${curr}`;	
    sendSms( smsDest, msg, logFail, ctx );
  } else if (prev > Setpoint && curr <= Setpoint) {
    console.log( "sending email..." );
    const msg = `open the windows? prev=${prev},curr=${curr}`;
    sendEmail( emailDest, emailSrc, msg, msg, logFail, ctx );
  }
}

function getPrevTemp( currTemp, failFunc, ctx ) {
  console.log( "curr temp:", currTemp );
  const InitialTemp = (ctx.secrets.SET_POINT || 74) * 2;
  ctx.storage.get( function( error, dataJsonDoc ) {
    if (error) { console.log( "storage-get error", error ); }
    console.log( "storage-got:", dataJsonDoc );
    dataJsonDoc = dataJsonDoc || { prevTemp: InitialTemp };
    const prevTemp = dataJsonDoc.prevTemp;
    dataJsonDoc.prevTemp = currTemp;
    ctx.storage.set( dataJsonDoc, function(error) {
      if (error) { console.log( "storage-set error", error ); }
    } );
    compareTemps( prevTemp, currTemp, ctx );
  } );
}

///////////////////////////////////////////////////////////////////////////////

function getTemp( tLocation, respondToTemp, respondToFail, ctx ) {
  // eg getTemp( "OR/Eugene", nextStepCallback, failCallback, context )
  const CurrConditsUrl = 'http://api.wunderground.com/api/WUKEY/conditions/q/LOCATION.json';    
  const url = CurrConditsUrl.replace( 'LOCATION', tLocation ).replace( 'WUKEY', ctx.secrets.WUNDERGROUND_KEY );
  fetch( url )
	.then( (resp) => resp.json() )    // Transform the data into json
	.then( (jsonData) => respondToTemp( jsonData.current_observation.temp_f, respondToFail, ctx ) )
	.catch( (error) => respondToFail( "current conditions", error ) );
}

function sendEmail( eTo, eFrom, eSubject, eContent, respondToFail, ctx ) {
  // send to a single to address. content is text/plain string.
  // eg: sendEmail( "bob@example.com", "alice@example.org", "subject subject", "text text", logFail, context );
  const EmailUrl = 'https://api.sendgrid.com/v3/mail/send';
  fetch( EmailUrl, {
      method: 'post',
      headers: {
	  'Content-Type': 'application/json',
	  'Authorization': "Bearer " + ctx.secrets.SENDGRID_KEY
      },
      body: JSON.stringify( 
	  {"personalizations":
	   [{"to": [{"email": eTo}]}],
	   "from": {"email": eFrom},
	   "subject": eSubject,
	   "content": [{"type": "text/plain", "value": eContent }]
	  } )
  } )
        .then( (resp) => resp.json() )
	.then( (jsonData) => logNormal( "email send response", jsonData ) )
	.catch( (error) => respondToFail( "email send", error ) );
}

function sendSms( sPhone, sMessage, respondToFail, ctx ) {
  // eg: sendSms( '5735290416', 'Yo Adrian!!', context );
  const SmsUrl = 'https://textbelt.com/text';
  fetch( SmsUrl, {
    method: 'post',
    headers: {
	'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: querystring.stringify( {
	'phone': sPhone,
	'message': sMessage,
	'key': ctx.secrets.TEXTBELT_KEY} )
  } )
	.then( (resp) => resp.json() )
	.then( (jsonData) => logNormal( "sms response", jsonData ) )
	.catch( (error) => respondToFail( "sms send fail", error ) );
}




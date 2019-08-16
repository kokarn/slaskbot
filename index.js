const TelegramBot = require( 'node-telegram-bot-api' );

const powers = require( './powers/' );

const bot = new TelegramBot( process.env.TELEGRAM_TOKEN, {
    polling: true,
} );

bot.on( 'polling_error', ( error ) => {
    console.log( error );
} );

powers.awaken( bot );

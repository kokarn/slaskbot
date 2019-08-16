const rss = require( './rss' );

module.exports = {
    awaken: ( bot ) => {
        for ( const command of rss ) {
            bot.onText( command.match, command.do.bind( this, bot ) );
        }
    },
};

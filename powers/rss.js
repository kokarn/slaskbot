const feedparser = require( 'feedparser' );
const got = require( 'got' );
const humanize = require( 'tiny-human-time' );

const FEED_CHECK_INTERVAL = 1800000;

let feeds = [];

const loadFeed = async function loadFeed( feed ) {
    console.log( 'Loading feed', feed.url );
    let requestStream;
    const currentFeedParser = new feedparser();
    let printed = 0;

    try {
        requestStream = await got.stream( feed.url );
        requestStream.pipe( currentFeedParser );
    } catch ( requestError ) {
        console.error( requestError );

        return false;
    }

    currentFeedParser.on( 'error', ( error ) => {
        console.error( error );
    } );

    currentFeedParser.on( 'readable', () => {
        let item;
        let message;

        while ( ( item = currentFeedParser.read() ) !== null ) {
            // Only print if we haven't seen the item before
            if ( arrayContainsObjectWithSameDescription( feed.items, item ) ) {
                console.log( 'Skipping' );

                continue;
            }

            feed.items.push( item );

            // Only print max one item per feed
            if ( printed <= 0 ) {
                let formattedItem = format( item, feed );
                message = formattedItem.title;

                if ( formattedItem.description ) {
                    message = message + '\n' + formattedItem.description;
                }

                message = message + '\n' + formattedItem.link;

                feed.bot.sendMessage( feed.chatID, message );
                printed = printed + 1;
            }
        }
    } );
};

const arrayContainsObjectWithSameDescription = function arrayContainsObjectWithSameDescription( list, obj ) {
    for ( const listItem of list ) {
        if ( obj.description === listItem.description ) {
            return true;
        }
    }

    return false;
};

const format = function format( item, feed ) {
    let returnObject = Object.assign( {}, item );
    const urlData = new URL( feed.url );

    returnObject.rawTitle = returnObject.title;
    returnObject.rawDescription = returnObject.description;
    returnObject.rawLink = returnObject.link;

    returnObject.description = false;

    switch ( urlData.hostname ) {
        case 'eliteprospects.com': {
            const statusRegex = new RegExp( 'Status:(.+?)\<.+?', 'gim' );
            const sourceRegex = new RegExp( 'Source:.+?href="(.+?)"', 'gim' );
            const status = statusRegex.exec( item.description );
            const source = sourceRegex.exec( item.description );

            returnObject.title = ' | ' + status[1].trim() + ' | ' + item.title;
            returnObject.link = source[1].trim();

            break;
        }

        default: {
            break;
        }
    }

    return returnObject;
};

module.exports = [
    {
        match: /\/add (.+)/,
        do: ( bot, message, match ) => {
            const chatID = message.chat.id;

            feeds.push( {
                url: match[ 1 ],
                items: [],
                chatID: chatID,
                bot: bot,
            } );

            loadFeed( feeds[ feeds.length - 1 ] );
            setInterval( loadFeed.bind( this, feeds[ feeds.length - 1 ] ), FEED_CHECK_INTERVAL );

            bot.sendMessage( chatID, `Feed added to list of watched feeds and will be checked every ${ humanize( FEED_CHECK_INTERVAL ) }` );
        }
    },
    {
        match: /\/list/,
        do: ( bot, message ) => {
            if ( feeds.length === 0 ) {
                bot.sendMessage( message.chat.id, 'No feeds in the list yet' );

                return true;
            }

            let returnMessage = '';

            for ( const feed of feeds ) {
                returnMessage = `${ returnMessage }* ${ feed.url }\n`;
            }

            bot.sendMessage( message.chat.id, returnMessage.trim() );
        }
    }
];

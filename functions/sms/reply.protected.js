const { Client: NotionClient } = require('@notionhq/client');
const { logHabit, addHabit, getDailySummary } = require('../../assets/notion');

exports.handler = async function (context, event, callback) {
    const notionClient = new NotionClient({ auth: context.NOTION_AUTH_TOKEN });
    const databaseId = context.NOTION_DATABASE_ID;

    const twiml = new Twilio.twiml.MessagingResponse();

    const message = event.Body.trim();
    const parts = message.split(' ');
    const command = parts[0].toLowerCase();

    let response;

    switch (command) {
        case 'log':
            const habit = capitalize(parts[1]);
            await logHabit(notionClient, databaseId, habit);

            response = `Logged ${habit}. Way to go!`;
            break;
        case 'add':
            const newHabit = capitalize(parts[1]);
            await addHabit(notionClient, databaseId, newHabit);

            response = `Added new habit ${newHabit}`;
            break;
        case 'summary':
            const stats = await getDailySummary(notionClient, databaseId);
            const summary = Object.entries(stats)
                .map(
                    ([name, completed]) => `${completed ? '✅' : '❌'} ${name}`
                )
                .join('\n');

            response = summary;
            break;
        default:
            response = 'Unknown command.';
    }

    twiml.message(response);

    callback(null, twiml);
};

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function logHabit(client, databaseId, habit) {
    const response = await client.databases.query({
        database_id: databaseId,
        filter: {
            property: 'Date',
            date: {
                equals: getTodayAsIsoDate(),
            },
        },
    });

    const hasPageForToday = response.results.length === 1;

    // Updates the existing page for today's date if it exists, otherwise creates a new page
    if (hasPageForToday) {
        const page = response.results[0];

        await client.pages.update({
            page_id: page.id,
            properties: {
                [habit]: {
                    checkbox: true,
                },
            },
        });
    } else {
        const currentDayOfWeek = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
        }).format(new Date());

        await client.pages.create({
            parent: {
                type: 'database_id',
                database_id: databaseId,
            },
            properties: {
                Name: {
                    title: [
                        {
                            text: {
                                content: currentDayOfWeek,
                            },
                        },
                    ],
                },
                Date: {
                    date: {
                        start: getTodayAsIsoDate(),
                    },
                },
                [habit]: {
                    checkbox: true,
                },
            },
        });
    }
}

async function addHabit(client, databaseId, habit) {
    await client.databases.update({
        database_id: databaseId,
        properties: {
            [habit]: {
                checkbox: {},
            },
        },
    });
}

async function getDailySummary(client, databaseId) {
    const pageForTodayRequest = client.databases.query({
        database_id: databaseId,
        filter: {
            property: 'Date',
            date: {
                equals: getTodayAsIsoDate(),
            },
        },
    });

    const databaseRequest = client.databases.retrieve({
        database_id: databaseId,
    });

    const [pageForTodayResponse, databaseResponse] = await Promise.all([
        pageForTodayRequest,
        databaseRequest,
    ]);

    // Map habit property IDs to their names for easy lookup
    const propertyIdToNameMap = Object.entries(databaseResponse.properties)
        .filter(([name]) => name !== 'Name' && name !== 'Date')
        .reduce((acc, curr) => ({ ...acc, [curr[1].id]: curr[0] }), {});

    const hasPageForToday = pageForTodayResponse.results.length === 1;

    // If there's no page for today's date, return false for all habit properties
    if (!hasPageForToday) {
        const propertyNames = Object.values(propertyIdToNameMap);

        return propertyNames.reduce(
            (acc, curr) => ({
                ...acc,
                [curr]: false,
            }),
            {}
        );
    }

    // Otherwise, get all habit property data and create summary object
    const page = pageForTodayResponse.results[0];
    const propertyIds = Object.keys(propertyIdToNameMap);

    const propertyRequests = propertyIds.map((id) =>
        client.pages.properties.retrieve({
            page_id: page.id,
            property_id: id,
        })
    );

    const propertyResponses = await Promise.all(propertyRequests);
    const stats = propertyResponses.reduce(
        (acc, curr) => ({
            ...acc,
            [propertyIdToNameMap[curr.id]]: curr.checkbox,
        }),
        {}
    );

    return stats;
}

function getTodayAsIsoDate() {
    const now = new Date();
    const localizedDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );
    return localizedDate.toISOString().split('T')[0];
}

module.exports = {
    logHabit,
    addHabit,
    getDailySummary,
};

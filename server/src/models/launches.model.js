const axios = require('axios');

const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';
const SPACEX_ROCKET_URL = 'https://api.spacexdata.com/v4/rockets';

async function populateLaunches(){
    console.log('Downloading launches ...');
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: {
                path: "rocket",
                select: {
                    name: 1
                },
                path: 'payloads',
                select: {
                    customers: 1
                },
            }
        }
    });

    if(response.status !== 200) {
        console.log('Data Failed to load ..');
        throw new Error('Launch Data Download Failed');
    }

    const launchDocs = response.data.docs;
    for( const launchDoc of launchDocs){
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const rocket = launchDoc['rocket'];

        const rocketResponse = await axios.get(`${SPACEX_ROCKET_URL}/${rocket}`);
        if (rocketResponse.status !== 200) {
            throw new Error('Failed to fetch rocket data');
        }
        const rocketName = rocketResponse.data.name;

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: rocketName,
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers,
        }

        // console.log(launch);

        await saveLaunch(launch);
    }
}

async function loadLaunchData(){
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });

    if(firstLaunch) {
        console.log('Launch already loaded ..');
    } else{
        await populateLaunches();
    }
}

async function findLaunch(filter){
    return await launches.findOne(filter); 
}

async function existsLaunchWithId(launchId){
    return await findLaunch({
        flightNumber: launchId,
    });
}

async function getLatestFlightNumber(){
    const latestLaunch = await launches.findOne().sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit){
    return await launches
        .find({}, {
        "_id": 0, "__v": 0,
    })
        .sort({flightNumber: 1})
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch){
    await launches.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true,
    });
}

async function scheduleNewLaunch(launch){
    const planet = await planets.findOne({
        keplerName: launch.target,
    });

    if(!planet){
        throw new Error('No matching planet found');
    }

    const newFlightNumber = await getLatestFlightNumber() + 1;

    const newLaunch = Object.assign(launch, {
        upcoming: true,
        success: true,
        customers: ['Arbbi', 'Alalla'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
}

async function abortLaunch(launchId){
    const aborted =  await launches.updateOne({
        flightNumber: launchId,
    },{
        upcoming: false,
        success: false,
    });

    return aborted.modifiedCount === 1;
}

module.exports = {
    loadLaunchData,
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithId,
    abortLaunch,
};
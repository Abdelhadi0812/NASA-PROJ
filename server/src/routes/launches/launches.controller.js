const {getAllLaunches,
scheduleNewLaunch,
existsLaunchWithId,
abortLaunch,
} = require('../../models/launches.model');

const {getPagination} = require('../../services/query');

async function httpGetAllLaunches(req, res){
    const {skip, limit} = getPagination(req.query);
    const launches = await getAllLaunches(skip, limit);

    return res.status(200).json(launches);
}

async function httpScheduleNewLaunch(req, res){
    const launch = req.body;

    if(!launch.mission || !launch.rocket || !launch.launchDate || !launch.target){
        return res.status(400).json({
            error:'Missing required launch data',
        });
    }

    launch.launchDate = new Date(launch.launchDate);
    if(isNaN(launch.launchDate)) {
        return res.status(400).json({
            error: 'The date you entered is Invalid. Please enter a valid one.',
        });
    }

    await scheduleNewLaunch(launch);
    return res.status(201).json(launch);
}

async function httpAbortLaunch(req, res){
    const launchId = Number(req.params.id);

    const existsLaunch = await existsLaunchWithId(launchId);
    
    if(!existsLaunch){
        return res.status(404).json({
            error:'Launch not found',
        });
    }

    const aborted = await abortLaunch(launchId);
    if(!aborted){
        return res.status(400).json({
            error: 'Launch not aborted',
        });
    }

    return res.status(200).json(aborted);
}

module.exports = {
    httpGetAllLaunches,
    httpScheduleNewLaunch,
    httpAbortLaunch,
}
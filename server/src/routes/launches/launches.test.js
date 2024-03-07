const request = require('supertest');
const app = require('../../app');
const {
    mongoConnect,
    mongoDisconnect
} = require('../../services/mongo');
const {loadPlanetsData} = require('../../models/planets.model');
const {loadLaunchData} = require('../../models/launches.model');

describe('Launches API', () => {
    beforeAll(async () => {
        await mongoConnect();
        await loadPlanetsData();
        await loadLaunchData();
    }, 10000);

    afterAll(async () =>{
        await mongoDisconnect();
    }, 10000);

    describe('Test GET /launches', ()=>{
        test('It should respond with 200 success', async ()=>{
            const response = await request(app).get('/v1/launches').expect('Content-Type', /json/).expect(200);
        });
    });
    
    describe('Test POST /launches', ()=>{
        const completeLaunchData = {
            mission: 'USS Missions',
            rocket: 'NCC 1701-D',
            target: 'Kepler-62 f',
            launchDate: 'January 4, 2028'
        };
    
        const launchDataWithoutDate = {
            mission: 'USS Missions',
            rocket: 'NCC 1701-D',
            target: 'Kepler-62 f',
        };
    
        const launchDataWithInvalidData = {
            mission: 'USS Missions',
            rocket: 'NCC 1701-D',
            target: 'Kepler-62 f',
            launchDate: 'Sir awdi layn3l 3a tabonmok'
        }
    
        test('It should respond with 201 success', async ()=>{
            const response = await request(app).post('/v1/launches').send(completeLaunchData).expect('Content-Type', /json/).expect(201);
    
            const requestDate = new Date(completeLaunchData.launchDate).valueOf();
            const responseDate = new Date(response.body.launchDate).valueOf();
            expect(responseDate).toBe(requestDate);
    
            expect(response.body).toMatchObject(launchDataWithoutDate);
        });
    
        test('It should catch missing required properties', async ()=>{
            const response = await request(app).post('/v1/launches').send(launchDataWithoutDate).expect('Content-Type', /json/).expect(400);
    
            expect(response.body).toStrictEqual({
                error:'Missing required launch data',
            });
        });
    
        test('It should catch invalid Date', async ()=>{
            const response = await request(app).post('/v1/launches').send(launchDataWithInvalidData).expect('Content-Type', /json/).expect(400);
    
            expect(response.body).toStrictEqual({
                error:'The date you entered is Invalid. Please enter a valid one.',
            });
        });
    });
})

const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe.only(`Bookmarks endpoints`, () => {
    let db;

    before('make knex instance', () => {
        db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('bookmarks').truncate());

    context(`given there are bookmarks in the database`, () => {
        const testBookmarks = makeBookmarksArray();

        beforeEach(`insert bookmarks`, () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks);
        });

        afterEach('Start with a fresh table', () => db('bookmarks').truncate());

        it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                   .get('/bookmarks')
                   .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                   .expect(200, testBookmarks)
        });

        it('GET /bookmark/:id responds with 200 and gets the requested bookmark', () => {
            return supertest(app)
                .get('/bookmarks/1')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testBookmarks[0])
        });
    });

    context(`given there are no bookmarks in the database`, () => {
        it(`GET /bookmarks resolves to empty array with no data`, () => {
            return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, [])
        });

        it(`GET /bookmarks/:id responds with 404 not found`, () => {
            return supertest(app)
                .get('/bookmarks/100')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404)
        });
    })
})
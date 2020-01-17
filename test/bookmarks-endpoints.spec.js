const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe(`Bookmarks endpoints`, () => {
    let db;

    before('make knex instance', () => {
        db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    });

    before('clean the table', () => db('bookmarks').truncate());

    beforeEach('clean the table', () => db('bookmarks').truncate());

    after('disconnect from db', () => db.destroy());

    describe('GET /bookmarks', () => {
        context('Given no bookmarks', () => {
            it(`GET /bookmarks resolves to empty array with no data`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            });
    
            it(`GET /bookmarks/:id responds with 404 not found`, () => {
                return supertest(app)
                    .get('/api/bookmarks/100')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404)
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach(`insert bookmarks`, () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });
    
            afterEach('Start with a fresh table', () => db('bookmarks').truncate());
    
            it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
                    return supertest(app)
                       .get('/api/bookmarks')
                       .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                       .expect(200, testBookmarks)
            });
    
            it('GET /bookmark/:id responds with 200 and gets the requested bookmark', () => {
                return supertest(app)
                    .get('/api/bookmarks/1')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks[0])
            });
        });

        context('Given an XSS attack bookmark', () => {
            const maliciousBookmark = {
                id: 911,
                title: 'Naughty naughty very naughty <script>alert("xss");</script>',
                url: 'https://www.hackers.com',
                description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                rating: 1,
            };

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            });
            
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
                        expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`);
                    })
            })
        })
    });

    describe(`POST /bookmarks`, () => {
        it(`creates a bookmark and responds with 201 and the newly created bookmark`, () => {
            const newBookmark = {
                title: 'test-title',
                url: 'https://test.com',
                description: 'test description',
                rating: 1,
            };

            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.description).to.eql(newBookmark.description);
                    expect(res.body.rating).to.eql(newBookmark.rating.toString());
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                );
        });
    });

    describe(`DELETE /bookmarks`, () => {
        context(`Given no bookmark`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 1234567;
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `Bookmark doesn't exist!`}})
            });
        });

        context(`Given there are bookmarks`, () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            });

            afterEach('Start with a fresh table', () => db('bookmarks').truncate());

            it('responds with 204 and removes the article', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                    );
            });
        });
    });

    describe(`Field validation`, () => {
        context(`Required fields are present`, () => {
            const requiredFields = ['title', 'url', 'rating'];

            //Check that each required field is present and responds with the appropriate status code if not
            requiredFields.forEach(field => {
                const newBookmark = {
                    title: "Test POST bookmark",
                    url: "https://www.test.com/",
                    rating: 3,
                    description: "Test new bookmark",
                };
    
                it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                    delete newBookmark[field]
                    return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                        })
                })
            });
        })
        
        context(`Data type is correct`, () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach(`insert bookmarks`, () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });
    
            afterEach('Start with a fresh table', () => db('bookmarks').truncate());

            it(`Rating is a number 1-5`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .then(response => {
                        let bookmarkIds = response.body.map(bm => bm.id);
                        let badIds = bookmarkIds.filter(id => (id > 5 || id < 1));
                        expect(badIds).to.eql([])
                    });
            });
        })

    });

    describe('PATCH /api/bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist!` } })
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            });

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated bookmark title',
                    url: 'updated.url.com',
                    rating: "3",
                    description: 'a new updated description!'
                };

                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
            });

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', 'rating', or 'description'`
                        }
                    });
            });

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated bookmark title'
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
            })
        });
    });

});
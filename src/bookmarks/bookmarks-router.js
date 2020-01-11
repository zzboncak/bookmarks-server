const express = require('express');
const logger = require('../logger');
const bookmarks = require('../store');
const uuid = require('uuid/v4');
const BookmarksService = require('../BookmarksService');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(response => {
                res.send(response)
            });
    })
    .post(bodyParser, (req, res) => {
        const { title, url, rating=3, description="Add description here"} = req.body;

        if(!title) {
            logger.error('Title is required');
            return res
                .status(400)
                .send('Invalid data');
        }

        if(!url) {
            logger.error('URL is required');
            return res
                .status(400)
                .send('Invalid data');
        }

        const id = uuid();

        const bookmark = {
            id,
            title,
            url,
            rating,
            description
        };

        bookmarks.push(bookmark);

        logger.info(`Bookmark with id ${id} created`);

        res
            .send(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(bookmark);
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        BookmarksService
            .getBookmarkById(req.app.get('db'), req.params.id)
            .then(response => {
                console.log(response);
                if(!response) {
                    res.sendStatus(404)
                }
                res.send(response);
            });
    })
    .delete((req, res) => {
        const { id } = req.params;

        const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

        if (bookmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found`);
            return res
                .status(404)
                .send('Not found');
        }

        bookmarks.splice(bookmarkIndex, 1);

        logger.info(`Bookmark with id ${id} deleted.`);

        res
            .status(204)
            .end();
    });

module.exports = bookmarksRouter;
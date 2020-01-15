const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const BookmarksService = require('../BookmarksService');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    rating: bookmark.rating,
    description: xss(bookmark.description)
});

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(response => {
                let sanitizedBookmarks = response.map(bm => serializeBookmark(bm));
                res.send(sanitizedBookmarks)
            });
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, rating, description} = req.body;
        const newBookmark = { title, url, rating, description};

        for(const [key, value] of Object.entries(newBookmark)) {
            if(value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                })
            }
        }

        BookmarksService.postBookmark(
            req.app.get('db'),
            newBookmark
        )
        .then(bookmark => {
            logger.info(`Bookmark with id ${bookmark.id} created`);
            res
                .status(201)
                .location(`/bookmarks/${bookmark.id}`)
                .json(serializeBookmark(bookmark))
        })
        .catch(next)

    })

bookmarksRouter
    .route('/bookmarks/:id')
    .all((req, res, next) => {
        BookmarksService.getBookmarkById(
            req.app.get('db'),
            req.params.id
        )
        .then(bookmark => {
            if(!bookmark) {
                return res.status(404).json({
                    error: {message: `Bookmark doesn't exist!`}
                })
            }
            res.bookmark = bookmark;
            next();
        })
        .catch(next)
    })
    .get((req, res) => {
        res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
        console.log(req.params.id);
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.id
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    });

module.exports = bookmarksRouter;
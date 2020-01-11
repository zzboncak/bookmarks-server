const BookmarksService = {
    getAllBookmarks(knex) {
        return knex.select('*').from('bookmarks');
    },
    getBookmarkById(knex, bookmarkId) {
        return knex
            .select('*')
            .from('bookmarks')
            .where('id', bookmarkId)
            .first()
    },
};

module.exports = BookmarksService;
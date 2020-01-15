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
    postBookmark(knex, newBookmark) {
        return knex
            .insert(newBookmark)
            .into('bookmarks')
            .returning('*')
            .then(rows => {
                return rows[0];
            });
    },
    deleteBookmark(knex, bookmarkId) {
        return knex('bookmarks')
            .where('id', bookmarkId )
            .delete();
    },
};

module.exports = BookmarksService;
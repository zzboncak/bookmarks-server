function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: "title 1",
            url: "www.url1.com",
            description: "description 1",
            rating: "1"
        },
        {
            id: 2,
            title: "title 2",
            url:"www.url2.com",
            description: "description 2",
            rating: "2"
        },
        {
            id: 3,
            title: "title 3",
            url: "www.url3.com",
            description: "description 3",
            rating: "3"
        }
    ]
}

module.exports = {
    makeBookmarksArray,
}
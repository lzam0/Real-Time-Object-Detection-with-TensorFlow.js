const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

/* landing page GET request from index.html */
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html', (err) => {
        if (err) {
            console.log(err);
        };
    })
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});


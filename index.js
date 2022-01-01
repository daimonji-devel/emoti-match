import express from 'express';
import http from 'http';
import path from 'path';
import url from 'url';

const app = express();

const modulePath = url.fileURLToPath(import.meta.url);
const publicPath = path.join(path.dirname(modulePath), 'public');
app.use(express.static(publicPath));

const port = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(port, () => console.log('emoti-match listens on port ' + port));

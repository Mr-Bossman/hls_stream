const ffmpeg = require('fluent-ffmpeg');
const hls = require('hls-server');
const fs = require('fs');
const express = require('express');
const app = express();
const server = app.listen(8080);
const execSync = require('child_process').execSync;

app.get('/', (req, res) => {
	return res.status(200).sendFile(`${__dirname}/index.html`);
});

const ffserv = ffmpeg('tcp://10.4.10.86:8010', { timeout: 432000 }).
inputOptions(['-re','-f h264', '-listen 1']).addOptions([
	'-profile:v baseline', // baseline profile (level 3.0) for H264 video codec
	'-level 3.0',
	'-s 640x360',          // 640px width, 360px height output video dimensions
	'-start_number 0',     // start the first .ts segment at index 0
	'-hls_time 10',        // 10 second segment duration
	'-hls_list_size 10',
	'-hls_flags delete_segments',
	'-f hls'               // HLS format
]).output('videos/output.m3u8').on('end',() => {rerun()});

const rerun = () => {
	ffserv.run();
}
execSync('rm -f videos/*');

rerun();
//ffmpeg -re -f v4l2 -i /dev/video2 -codec h264 -f h264 -pix_fmt yuv420p tcp://10.4.10.86:8010 
//sudo ffmpeg -listen 1 -re -f h264 -i tcp://10.4.10.86:8010 -profile:v baseline -level 3.0 -s 640x360 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls videos/output.m3u8
new hls(server, {
	provider: {
	    exists: (req, cb) => {
		const ext = req.url.split('.').pop();
		if (ext !== 'm3u8' && ext !== 'ts') {
		    return cb(null, true);
		}
		fs.access(__dirname + req.url, fs.constants.F_OK, function (err) {
		    if (err) {
			console.log('File doesn\'t exist');
			return cb(null, false);
		    }
		    cb(null, true);
		});
	    },
	    getManifestStream: (req, cb) => {
		const stream = fs.createReadStream(__dirname + req.url);
		cb(null, stream);
	    },
	    getSegmentStream: (req, cb) => {
		const stream = fs.createReadStream(__dirname + req.url);
		cb(null, stream);
	    }
	}
});
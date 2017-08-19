/**
 * server.js
 * This file defines the server to display
 * a gallery of videos.
 */
"use strict;"

/* global variables */
var multipart = require('./multipart');
var template = require('./template')
var http = require('http');
var url = require('url');
var fs = require('fs');
var port = 3000;

/* load cached files */
var config = JSON.parse(fs.readFileSync('config.json'));
var stylesheet = fs.readFileSync('public/gallery.css');
var script = fs.readFileSync('public/gallery.js');

var videos = JSON.parse(fs.readFileSync('videos.json'));
var videoStylesheet = fs.readFileSync('public/video.css');


/* load templates */
template.loadDir('templates');

/** @function getImageNames
 * Retrieves the filenames for all images in the
 * /images directory and supplies them to the callback.
 * @param {function} callback - function that takes an
 * error and array of filenames as parameters
 */
 /*
function getImageNames(callback)
{
  fs.readdir('images/', function(err, fileNames)
  {
    if(err) callback(err, undefined);
    else callback(false, fileNames);
  });
}
*/

/** @function getVideoNames
  */
function getVideoNames(callback)
{
    fs.readdir('videos/', function(err, fileNames)
    {
        if (err) callback(err, undefined);
        else callback(false, fileNames);
    });
}

/* build html string with every video appearing in it's own div that links to it's own page */
function videoNamesToTags(fileNames)
{
  console.log('[LOG] ----------------------');
  console.log('[LOG] Stepping into videoNamesToTags()');
  console.log('[LOG] -- parameter fileNames = ' + JSON.stringify(fileNames));
  return fileNames.map(function(fileName)
  {
      var fileNameNoExtension = fileName.split('.')[0];
      console.log('[LOG] fileName in videoNamesToTags() to match -- ' + fileNameNoExtension);
      console.log('[LOG] current videos array -- ' + JSON.stringify(videos));
      var thumbnail = videos[fileNameNoExtension].thumbnail;
      var videoName = videos[fileNameNoExtension].videoName;
      var videoNameWithSpaces = videoName.replace(/_/g,' ');
      var uploadDate = videos[fileNameNoExtension].uploadDate;
      var upvotes = videos[fileNameNoExtension].upvotes;
      var downvotes = videos[fileNameNoExtension].downvotes;
      var views = videos[fileNameNoExtension].views;
      var description = videos[fileNameNoExtension].videoDescription;
      //return `<a href="${fileNameNoExtension}"><div id="video-div"> <img src="${thumbnail}" width="75px" border="1"> ${videoNameWithSpaces} Upload Date: ${uploadDate} <img src="/public/thumb-up.png" width="25px"> ${upvotes} <img src="/public/thumb-down.png" width="25px"> ${downvotes} Views: ${views}</div></a><br>`;
      return `<a href="${fileNameNoExtension}"><div id="video-div"> <table class="videoTable" border="0"><tr><td><img src="${thumbnail}" width="300px" border= "2px solid black"> </td><td><table border="0"><tr><td id="videoName">${videoNameWithSpaces}</td><td id="views">Views: ${views}</td></tr><tr><td id="uploadDate">Uploaded: ${uploadDate} </td><td id="thumbs"><img src="/public/thumb-up.png" width="40px"> ${upvotes} <img src="/public/thumb-down.png" width="40px"> ${downvotes}</td></tr></table></td></tr></table></div></a><br>`;

  })
}

/**
 * @function buildGallery
 * A helper function to build an HTML string
 * of a gallery webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * gallery images.
 */
function buildGallery(videoTags)
{
  return template.render('gallery.html',
  {
    title: config.title,
    videoTags: videoNamesToTags(videoTags).join('')
  });
}

/* build the html page that will be displayed for a video as well as increment the viewcount of the video */
function buildVideoPage(videoname) // want to offer some size %age options here?
{
  console.log('[[LOG]] videoname parsed in buildVideoPage() -- ' + videoname);
  console.log('[LOG] parsed in buildVideoPage() : ' + JSON.stringify(videos[videoname]));
  console.log('[LOG] parsed videoFile : ' + videos[videoname].videoFile);
  console.log('[LOG] parsed videoname : ' + videos[videoname].videoName);
  console.log('[LOG] parsed upload date : ' + videos[videoname].uploadDate);
  console.log('[LOG] parsed upvotes : ' + Number(videos[videoname].upvotes));
  console.log('[LOG] parsed downvotes : ' + Number(videos[videoname].downvotes));
  console.log('[LOG] parsed views : ' + Number(videos[videoname].views));

  /* increment view count of video when opened */

  var currentPlayCount = Number(videos[videoname].views);
  currentPlayCount+=0.5; // some reason we call this function twice while displaying it -- this hackity version keeps view intact.
  console.log('[LOG] Attempting to write updated views to cache and disk...');
  videos[videoname].views = currentPlayCount;
  // write the update JSON master list to file.
  fs.writeFileSync('videos.json', JSON.stringify(videos));
  console.log('[LOG] SUCCESS!');

//height 560
  return template.render('video.html',
  {
      videoFile: '<video width="990px" controls autoplay><source src="' + videos[videoname].videoFile + '" type="video/mp4"></video>',
      videoName: videos[videoname].videoName.replace(/_/g,' '),
      uploadDate: videos[videoname].uploadDate,
      upvotes: videos[videoname].upvotes,
      downvotes: videos[videoname].downvotes, // testing this, don't know if we want an integer or string here.
      views: videos[videoname].views,
      videoDescription: videos[videoname].videoDescription,
      title: config.title
  });
}

/* serve the build video page from buildVideoPage() to the user */
function serveVideoPage(req, res, videoname)
{
  console.log('[LOG] req: ' + req);
  console.log('[LOG] res: ' + res);
  res.setHeader('Content-Type', 'text/html');
  var temp2 = buildVideoPage(videoname);
  console.log('[LOG] about to leave serveVideoPage()');
  console.log('[LOG] value of html document:');
  console.log(temp2);
  res.end(buildVideoPage(videoname));
}

/** @function serveVideo
  * A function to serve a video file.
  * @param {string} filename - the filename of the image to serve.
  * @param {http.incomingRequest} - the request object
  * @param {http.serverResponse} - the response object
  */
function serveVideo(req, res, fileName)
{
  console.log("[LOG] fileName in serveVideo() -- " + fileName);
  fs.readFile('videos/' + decodeURIComponent(fileName), function(err, data)
  {
    if (err)
    {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.end(data);
  })
}

/** @function serveGallery
 * A function to serve a HTML page representing a
 * gallery of images.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function serveGallery(req, res)
{
  getVideoNames(function(err, videoNames)
  {
    if(err)
    {
      console.error(err);
      res.statusCode = 500;
      res.statusMessage = 'Server error';
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(buildGallery(videoNames));
  });
}

/* serve resource images from teh public folder that are commonly used on the site */
function serveResourceImage(fileName, req, res)
{
  console.log("[LOG] attempting to serve " + fileName);
  fs.readFile('public/' + fileName, function(err, data)
  {
    if (err)
    {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/*');
    res.end(data);
  });
}

/* serve a thumbnail image for a video that will appear in the main gallery */
function serveThumbnail(fileName, req, res)
{
  console.log("[LOG] attempting to serve " + fileName);
  fs.readFile('videoThumbnails/' + fileName, function(err, data)
  {
    if (err)
    {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/*');
    res.end(data);
  });
}


/** @function uploadVideo
 * A function to process an http POST request
 * containing an image to add to the gallery.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function uploadVideo(req, res)
{
  console.log('[LOG] --------------------');
  console.log('[LOG] stepping into uploadVideo()');
  var usingDefaultThumb = 0; // 0 is for default, 1 is for custom.
  multipart(req, res, function(req, res)
  {
    if (!req.body.videoFile)
    {
        console.error("No video file in upload");
        res.statusCode = 400;
        res.statusMessage = "No video file in upload";
        res.end("No video file in upload");
        return;
    }
    else
    {
        console.log('[LOG] Video file found successfully in upload: ' + req.body.videoFile);
    }

    if (!req.body.videoThumbnail)
    {
        console.log('[LOG] No video thumbnail provided -- using default.');
        usingDefaultThumb = 0;
    }
    else
    {
        console.log('[LOG] Video thumbnail found successfully in upload: ' + req.body.videoThumbnail);
        usingDefaultThumb = 1;
    }

    if (!req.body.videoDescription)
    {
        console.error("[LOG] No video description in upload");
        res.statusCode = 400;
        res.statusMessage = "No video description in upload";
        res.end("No video description in upload");
        return;
    }
    else
    {
        console.log('[LOG] Video description found successfully in upload: ' + req.body.videoDescription);
    }

    // custom addition to make sure the image name is 8 digits long and ONLY digits. Upload differently supplying passcode as filename.

    if (usingDefaultThumb == 1)
    {
        var newVideoThumbnail = req.body.videoFile.filename.split('.')[0] + '.png';

        console.log('[LOG] Attempting to write new thumbnail file: ' + newVideoThumbnail + '...');

        fs.writeFileSync('videoThumbnails/' + newVideoThumbnail, req.body.videoThumbnail.data, function(err)
        {
          if(err)
          {
            console.error(err);
            res.statusCode = 500;
            res.statusMessage = "Error while uploading thumbnail";
            res.end("Error while uploading thumbnail");
            return;
          }
        });

        console.log('[LOG] SUCCESS!!!');
    }

    console.log('[LOG] Attempting to write new video file: ' + req.body.videoFile.filename + '...');

    fs.writeFileSync('videos/' + req.body.videoFile.filename, req.body.videoFile.data, function(err)
    {
      if (err)
      {
          console.error(err);
          res.statusCode = 500;
          res.statusMessage = "Error while uploading video file.";
          res.end("Error while uploading video file");
          return;
      }
    });

    console.log('[LOG] SUCCESS!!!');

    console.log('[LOG] Attempting to update server cache with new video file, video thumbnail, and description...');

    // add the newly uploaded thumbnail image and video file to JSON database.
    var tempDate = new Date().toLocaleDateString();
    if (usingDefaultThumb == 0)
    {
        videos[req.body.videoFile.filename.split('.')[0]] = {"videoFile":req.body.videoFile.filename, "thumbnail":"defaultThumb.png", "videoName":req.body.videoFile.filename.split('.')[0], "uploadDate":tempDate, "upvotes":"0", "downvotes":"0", "views":"0", "videoDescription":req.body.videoDescription};
    }
    else
    {
        videos[req.body.videoFile.filename.split('.')[0]] = {"videoFile":req.body.videoFile.filename, "thumbnail":newVideoThumbnail, "videoName":req.body.videoFile.filename.split('.')[0], "uploadDate":tempDate, "upvotes":"0", "downvotes":"0", "views":"0", "videoDescription":req.body.videoDescription};
    }

    console.log('[LOG] SUCCESS!!!');
    console.log('[LOG] Attempting to write updated cache to disk...');
    // write the update JSON master list to file.
    fs.writeFileSync('videos.json', JSON.stringify(videos));
    console.log('[LOG] SUCCESS!');

    serveGallery(req, res);

  });
}


/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res)
{
  // at most, the url should have two parts -
  // a resource and a querystring separated by a ?
  var urlParts = url.parse(req.url);

  if(urlParts.query)
  {
    var matches = /title=(.+)($|&)/.exec(urlParts.query);
    if(matches && matches[1]){
      config.title = decodeURIComponent(matches[1]);
      fs.writeFile('config.json', JSON.stringify(config));
    }
  }

  switch(urlParts.pathname) {
    case '/':
    case '/index':
    case '/homepage':
      if(req.method == 'GET') {
        serveGallery(req, res);
      } else if(req.method == 'POST') {
        uploadVideo(req, res);
      }
      break;
    case '/gallery.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
    case '/gallery.js':
      res.setHeader('Content-Type', 'text/javascript');
      res.end(script);
      break;
    case 'video.css':
    case '/public/video.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(videoStylesheet);
      break;
    case '/public/thumb-up.png':
      serveResourceImage('thumb-up.png', req, res);
      break;
    case '/public/thumb-down.png':
      serveResourceImage('thumb-down.png', req, res);
      break;
    case 'favicon.ico':
    case 'favicon':
    case '/public/favicon':
    case '/public/favicon.ico':
      serveResourceImage('favicon.ico', req, res);
      break;
    default:

      var pathNoSlash = urlParts.pathname.substring(1);

      console.log('[LOG] path received in default: ' + pathNoSlash + '...');

      var fileExtension = pathNoSlash.split('.')[1];

      if (fileExtension == 'mp4')
      {
          console.log('[LOG]------------------------');
          console.log('[LOG] Attempting to call serveVideo() w/ -- ' + pathNoSlash);
          serveVideo(req, res, pathNoSlash);
      }
      else if (fileExtension == 'png')
      {
          console.log('[LOG]------------------------');
          console.log('[LOG] Attempting to call serveThumbnail() w/ -- ' + pathNoSlash);
          serveThumbnail(pathNoSlash, req, res);
      }
      else // serving the template video page
      {
          if (pathNoSlash == undefined) break;
          console.log('[LOG]------------------------');
          console.log('[LOG] Attempting to call serveVideoPage() w/ -- ' + pathNoSlash);
          serveVideoPage(req, res, pathNoSlash);
      }

  }
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("[LOG] Server is listening on port ", port);
});

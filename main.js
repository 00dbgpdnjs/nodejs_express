// API
var express = require('express')
var app = express()
var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var bodyParser = require('body-parser');
var sanitizeHtml = require('sanitize-html');
var compression = require('compression');
var template = require('./lib/template.js');
var helmet = require('helmet'); // just for security about all commom issue

// In our application, helmet, static, bodyparser, compression and list middleware are executed whenever a request is received.
app.use(helmet());
app.use(express.static('public')); // Refer to express.txt-7 / Put the folder name to use as static file / how to open the static file : localhost:3000/images/hello.jpg  / Add <img src="/images/hello.jpg"> in html
app.use(bodyParser.urlencoded({ extended: false })); // Refer to express.txt-4
app.use(compression()); // Refer to express.txt-5
/* 
app.use(function(request, response, next){
  fs.readdir('./data', function(error, filelist){
    request.list = filelist; // .list : request is a obj and it's this middleware's name like "myLogger" above and I named a var "list"  to put "filelist"
    next(); // just for a next any middleware
  });
}); // Refer to express.txt-6
*/ 
app.get('*', function(request, response, next){
  fs.readdir('./data', function(error, filelist){
    request.list = filelist;
    next();
  });
}); // Similar to the code above. The difference is the code above is for all app But ".._process" pages(=post page) don't need list middleware So this code is for all(=* : all path) app.get. i.e. all app.get's function is a also middleware I made.

app.get('/', function(request, response){
  /* Before using list middleware
  fs.readdir('./data', function(error, filelist){
    // console.log(request);
    // console.log(request.list); // >> lists like html, css3 (on only the path, /)
    var title = 'Welcome';
    var description = 'Hello, Node.js';
    var list = template.list(filelist);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      `<a href="/create">create</a>`
    );
    response.send(html);
  });
  */
  var title = 'Welcome';
  var description = 'Hello, Node.js';
  var list = template.list(request.list);
  var html = template.HTML(title, list,
    `
    <h2>${title}</h2>${description}
    <img src="/images/hello.jpg" style="width:300px; display:block; margin-top:10px">
    `,
    `<a href="/create">create</a>`
  ); // block : img ling-break
  response.send(html);
});

app.get('/page/:pageId', function(request, response, next){ // = like queryData.id is defined / Refer to express.txt-3 for the 1st arg 
  var filteredId = path.parse(request.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
    if(err){ // process like "/page/~~" pages as error  / ~~: non-existent file in the data dir / If no this code, title will be ~~ and desc will be undefinded on web.
      next(err); // Call a middleware which has 4args below right away
    } else {
      var title = request.params.pageId;
      var sanitizedTitle = sanitizeHtml(title);
      var sanitizedDescription = sanitizeHtml(description, {
        allowedTags:['h1']
      });
      var list = template.list(request.list);
      var html = template.HTML(sanitizedTitle, list,
        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
        ` <a href="/create">create</a>
          <a href="/update/${sanitizedTitle}">update</a>
          <form action="/delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`
      );
      response.send(html);
    }
  });
});

app.get('/create', function(request, response){
  var title = 'WEB - create';
  var list = template.list(request.list);
  var html = template.HTML(title, list, `
    <form action="/create_process" method="post">
      <p><input type="text" name="title" placeholder="title"></p>
      <p>
        <textarea name="description" placeholder="description"></textarea>
      </p>
      <p>
        <input type="submit">
      </p>
    </form>
  `, '');
  response.send(html);
});

app.post('/create_process', function(request, response){
  /* Before using bodyParser
  var body = '';
  request.on('data', function(data){
      body = body + data; // Caz unlike the get method, post method data can have a large data size.
  });
  request.on('end', function(){ // When the end event (=no more data) occur, process {~~} 
    var post = qs.parse(body);
    var title = post.title;
    var description = post.description;
    fs.writeFile(`data/${title}`, description, 'utf8', function(err){
      // response.writeHead(302, {Location: `/?id=${title}`});
      // response.end();
      response.redirect(`/page/${title}`);
    })
  });
  */
  var post = request.body; 
  var title = post.title;
  var description = post.description;
  fs.writeFile(`data/${title}`, description, 'utf8', function(err){
    response.redirect(`/page/${title}`);
  });
});

app.get('/update/:pageId', function(request, response){
  var filteredId = path.parse(request.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
    var title = request.params.pageId;
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `
      <form action="/update_process" method="post">
        <input type="hidden" name="id" value="${title}">
        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
        <p>
          <textarea name="description" placeholder="description">${description}</textarea>
        </p>
        <p>
          <input type="submit">
        </p>
      </form>
      `,
      `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
    );
    response.send(html);
  });
});

app.post('/update_process', function(request, response){
  var post = request.body;
  var id = post.id;
  var title = post.title;
  var description = post.description;
  fs.rename(`data/${id}`, `data/${title}`, function(error){
    fs.writeFile(`data/${title}`, description, 'utf8', function(err){
      response.redirect(`/page/${title}`);
    })
  });
});

app.post('/delete_process', function(request, response){
  var post = request.body;
  var id = post.id;
  var filteredId = path.parse(id).base;
  fs.unlink(`data/${filteredId}`, function(error){
    response.redirect('/');
  });
});

app.use(function(req, res, next) {
  res.status(404).send('Sorry cant find that!');
}); // middleware processing non-existent pages as error(404)

app.use(function(err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
}); // This middleware for error has 4 args because of next(err) above

// 404 vs 500 : caused by the  client(url) vs server.

app.listen(3000, () => console.log('Example app listening on port 3000!')) // If a web connect to 3000 port, print the sentence in terminal 

/* Before using express' route
var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if(pathname === '/'){
      if(queryData.id === undefined){
      } else {
      }
    } else if(pathname === '/create'){
    } else if(pathname === '/create_process'){
    } else if(pathname === '/update'){
    } else if(pathname === '/update_process'){
    } else if(pathname === '/delete_process'){      
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);
*/

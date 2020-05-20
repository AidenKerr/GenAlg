var express = require('express');
var router = express.Router();

/* GET home page. */

// TODO This doesn't seem to do anything (i need to learn node properly)
router.get('/start', function(req, res, next) {
  res.render('home', { title: 'Colony Collapse Disorder' });
});

module.exports = router;

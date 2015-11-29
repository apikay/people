/**
 * Created by Paul on 11/25/2015.
 */
'use strict';
exports.csv = function(req, res, next) {
  var type = req.params.type;
  var model;

  switch(type) {
    case 'users':
      model = req.app.db.models.User.find();
      break;
    default:
      return res.status(404)        // HTTP status 404: NotFound
        .send('Not found');
  }

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename=' + type + '.csv'
  });
  model.csv(res);
};

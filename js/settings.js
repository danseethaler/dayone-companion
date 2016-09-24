const storage = require('electron-json-storage');

storage.set('foobar', { foo: 'bar' }, function(error) {
    if (error) throw error;

    storage.get('foobar', function(error, object) {
        // console.log(object.foo);
        // will print "bar"
    });

});

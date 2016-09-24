var multiLineVariable = 'Multi\nline\nstring';

// get the child_process module
const cp = require('child_process');

// open a child process
var process = cp.exec('dayone new', (error, stdout, stderr) => {
    console.log(error, stdout, stderr);
});

// write your multiline variable to the child process
process.stdin.write(multiLineVariable);
process.stdin.end();

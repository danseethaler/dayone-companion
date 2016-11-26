// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var iconvlite = require('iconv-lite');
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const $ = require('../resources/jquery-3.1.0.min.js');

// Utility Functions
function makePathParts(directory) {
    return {
        ext: path.extname(directory),
        basename: path.basename(directory, path.extname(directory)),
        dir: path.dirname(directory),
        fullPath: directory,
        fullSafePath: directory.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&"),
    };
}

// Event handlers
document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault()
}

document.body.ondrop = (ev) => {

    // https://github.com/jgm/pandoc/releases/download/1.17.2/pandoc-1.17.2-osx.pkg
    try {
        cp.execSync("type pandoc")
    } catch (e) {
        try {

            cp.execSync("type brew");
            $('#alert-info').text('Installing Pandoc. This will take a minute...');
            $('#alert-info').slideDown();

            cp.execSync("brew install pandoc");
            $('#alert-info').slideUp();

        } catch (e) {
            $('#alert-info').text("Please install Pandoc or Homebrew before continuing.");
            $('#alert-info').slideDown();
        }
    }
    // process.stdin.write(config.content);
    // process.stdin.end();
    //
    //
    // if ! type pandoc > /dev/null; then
    //   # install foobar here
    // fi

    var re;

    var regex = document.getElementById('regex').value.trim();
    // Remove the containing forward slashes if any
    if (regex) regex = regex.replace(/^\/|\/$/g, '');

    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        iterateDirectory(ev.dataTransfer.files[i].path, regex);
    }

  ev.preventDefault();

}

function readFileSync_encoding(filename, encoding) {
    var content = fs.readFileSync(filename);
    return iconvlite.decode(content, encoding);
}

function notifyWarning(message) {
    $('#alert-info').show();
    $('#alert-info-message').html($('#alert-info-message').html() + '<p>' + message + '</p>');
}

function iterateDirectory(directory, regex) {

    var stats = fs.statSync(directory);

    if (!stats.isDirectory()) {
        var file = Object.assign({}, makePathParts(directory), stats);
        stageFile({
            file,
            regex,
            renameOnImport: true
        });
    } else {
        var directoryFiles = fs.readdirSync(directory);
        for (var i = 0; i < directoryFiles.length; i++) {
            iterateDirectory(directoryFiles[i]);
        }
    }

}

function stageFile(config){

    var config = config; // Set the config within this scope to be access in fileReadSync

    // Get the contents of the file
    switch (config.file.ext.toLowerCase()) {

        case '.pdf':

            var command = 'automator -i ' + config.file.fullSafePath + ' ./resources/extract_pdf_text.app';
            cp.execSync(command, (error) => {});

            // Convert Mac encoding to UTF-8
            var desktop = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
            var tempFilePath = desktop + '/Desktop/' + config.file.basename + '.txt';
            config.content = readFileSync_encoding(tempFilePath, 'MAC');

            // Delete temporary file
            tempFilePath = tempFilePath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            var command = 'rm -rf ' + tempFilePath;

            cp.exec(command, (error) => {
                if (error) {
                    console.log('error', error);
                }
            });

            break;

        case '.rtf':
        case '.txt':
            config.content = fs.readFileSync(config.file.fullPath, 'ascii');
            break;

        case '.doc':

                var command = 'textutil -convert docx ' + config.file.fullSafePath;
                cp.execSync(command, (error) => {});

                var newPath = config.file.dir + '/' + config.file.basename + config.file.ext + 'x';

                var command = 'pandoc ' + newPath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' --wrap=preserve -t markdown ';
                var buffer = cp.execSync(command, (error) => {});
                config.content = buffer.toString('utf-8');

                var command = 'rm -rf ' + newPath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' --wrap=preserve -t markdown ';
                cp.exec(command, (error) => {});

            break;

        case '.pages':

            var command = 'automator -i ' + config.file.fullSafePath + ' ./resources/pages_to_docx.app';
            cp.execSync(command, (error) => {});

            var newPath = config.file.dir + '/' + config.file.basename + '.docx';

            var command = 'pandoc ' + newPath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' --wrap=preserve -t markdown ';
            var buffer = cp.execSync(command, (error) => {});
            config.content = buffer.toString('utf-8');

            var command = 'rm -rf ' + newPath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' --wrap=preserve -t markdown ';
            cp.exec(command, (error) => {});

            break;

        case '.htm':
        case '.html':
        case '.docx':

            var command = 'pandoc ' + config.file.fullPath.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' --wrap=none -t markdown ';
            var buffer = cp.execSync(command, (error) => {});

            config.content = buffer.toString('utf-8');
            // Removing the html tags
            config.content = config.content.replace(/<\/?[^>]+(>|$)/g, "");
            config.content = config.content.replace(/\n{2,}|\\\n/g, "\n");
            config.content = config.content.replace(/\n[\ \ \t]+(.)/g, "\n$1");

            contentIs = config.content;

            break;

        case '.png':
        case '.jpg':
        case '.jpeg':

            config.content = '';
            config.photoPath = config.file.fullPath;

            break;

        default:
            notifyWarning('Unsupported file type: ' + config.file.basename + '<b>' + config.file.ext + '</b>' );
    }

    var contentsList = [],
        text,
        title,
        date;

    if (config.regex || !document.getElementById('rename_file').checked) {
        config.renameOnImport = false;
    }

    // Remove spaces that stop bold markdown
    // config.content = config.content.replace(/\ \*\*|\*\*\ /g, "**");

    // Parse the content based on a regular expression if provided
    if (config.regex) {
        // console.log('config.regex', config.regex);
        contentsList = config.content.split(new RegExp(config.regex.replace(/^\/|\/$/g, '')));
        // contentsList = config.content.split(new RegExp(/[^-](\s+)From: /));
    } else {
        contentsList = [config.content];
    }

    for (var i = 0; i < contentsList.length; i++) {

        text = contentsList[i].trim();

        if (text || config.photoPath) {

            var titleFrom = $('#title-from').val();

            switch (titleFrom) {
                case 'filename':
                    title = config.file.basename.replace(' DayOne', '');
                    break;
                case 'regex':

                    title = contentsList[i].match(new RegExp($('#file-regex').val().replace(/^\/|\/$/g, '')));

                    if (title) {
                        title = title.valueOf()[0].replace(/Subject\: |Fw\: |Re\: +/g, '').trim();
                    } else {
                        title = '';
                    }

                    break;

                default:
                    title = '';

            }

            if (document.getElementById('add_parent_folder').checked) {
                var dirArray = config.file.dir.split('/');
                title = dirArray.pop() + ' - ' + title;
            }


            date = extractDateFromString([
                config.file.basename,
                contentsList[i]
            ]);

            if (!date) date = config.file.birthtime;

            var importedId = /(Imported|DayOne)_[0-9,A-Z]{32}/i.exec(config.file.fullPath);
            if (importedId) {
                importedId = importedId[0].replace(/Imported_|DayOne_/i, '');
                var actionString = '<a href="dayone2://view?entryId=' + importedId + '">View In Journal</a>';
            } else {
                var actionString = '<button name="create" class="create-entry btn btn-default btn-sm">Create Entry</button>';
            }

            $('#staging-table tbody').append('<tr data-photo-path="' + config.photoPath + '" data-index="' + i + '" class="entry-item" data-file="' + config.file.fullPath + '" data-rename="' + config.renameOnImport + '"><td class="entry-title" contenteditable="true">' + title + '</td><td class="entry-date" contenteditable="true">' + date + '</td><td class="entry-content" style="display:none;"><textarea>' + contentsList[i] + '</textarea></td><td>' + actionString + '</td></tr>');

        }
    }

    $(".create-entry").off('click');

    $(".create-entry").click(function(){

        $(this).blur();

        var parent = $(this).parents('tr.entry-item');
        var title = parent.find('.entry-title').text();
        var date = parent.find('.entry-date').text();
        var content = parent.find('.entry-content textarea').val();

        var config = {
            content: title.concat('\n\n', content),
            date,
            file: parent.data('file'),
            photoPath: parent.data('photo-path'),
            renameOnImport: parent.data('rename'),
        };

        createEntry(config);

        $(this).replaceWith('<b style="color:#41B3FA;">Imported</b>');

    })

}

function extractDateFromString(strings) {

    var date;

    var regExs = [
        /\w+\s\d{1,2},\s\d{4}\s\d{1,2}:\d{2}\s[A|P]M/i,
        {
            regex: /((0?[1-9])|(1[0-2]))(?:\/|:)[0-3]?[0-9](?:\/|:)(([0-9]{2,4}))/i,
            find: /:/g,
            replace: '/',
        },
        /\w+\s\d{1,2},\s\d{4}\sat\s\d{1,2}:\d{2}:\d{2}\s[A|P]M/i,
        /\w+\s\d{1,2},\s\d{4}\sat\s\d{1,2}:\d{2}:\d{2}\s[A|P]M/i,
        /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) \d{1,2},? (?:19[7-9]\d|2\d{3})(?=\D|$)/i,

    ]

    // if (typeof strings != 'array') strings = [strings];

    for (var i = 0; i < strings.length; i++) {

        for (var r = 0; r < regExs.length; r++) {

            if (regExs[r].regex == 'undefined') {
                if (strings[i].match(regExs[r])) {
                    return matchDateToString(strings[i].match(regExs[r]));
                }
            } else if (regExs[r].regex) {
                if (regExs[r].regex.test(strings[i])) {
                    return matchDateToString(strings[i].match(regExs[r].regex), regExs[r].find, regExs[r].replace);
                }
            }

        }
    }

    return false;

}

function matchDateToString(date, regEx, replaceWith) {
    var date = date.valueOf()[0]
        .replace(/\*|\\|Date:|Sent:/gi, '')
        .trim();

    if (regEx) {
        date = date.replace(regEx, replaceWith);
    }

    return date;

}


function createEntry(config) {

    var config = config;

    if (config.photoPath && config.photoPath != "undefined") {
        var command = 'dayone -p="' + config.photoPath + '" -d="' + config.date + '" new';
    } else {
        var command = 'dayone -d="' + config.date + '" new';
    }


    // console.log(command);
    var process = cp.exec(command, (error, stdout, stderr) => {
        if (error) {
            // console.log('error', error);
            return;
        }
        // console.log('stdout', stdout);
        var entryId = stdout.substr(stdout.lastIndexOf('/')+ 1);
        entryId = entryId.substr(0, entryId.lastIndexOf('.'));

        // console.log('entryId:', entryId);

        // console.log('config', config);

        if (config.renameOnImport && (config.file.indexOf('DayOne') < 0)) {

            var extension = path.extname(config.file);
            var basename = path.basename(config.file, extension);
            var directory = path.dirname(config.file);

            // The entry ID returned is just a temporary id :(
            // var newFile = directory + '/' + basename + ' DayOne_' + entryId + extension;
            var newFile = directory + '/' + basename + ' DayOne' + extension;

            cp.execSync('mv ' + config.file.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ' ' + newFile.replace(/['[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));

        }

        // console.log('Completed ' + config.file);

    });

    process.stdin.write(config.content);
    process.stdin.end();

}

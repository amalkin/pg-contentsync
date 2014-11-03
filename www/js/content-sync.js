
function contentSync(options) {

    var defaults = {        // Default values for the provided options
        openFile:           "index.html",           // Path of the file in the ZIP archive to redirect the browser to when the extraction is done
        ignoredFiles:       /(?:^|\/)(?:\.|__)/,    // RegEx capturing files of the ZIP archive to ignore (filenames starting with "." or "__")
        workerScriptsPath:  "js/",                  // Path to deflate.js and inflate.js
        selectorIframe:     "iframe",
        selectorRefresh:    ".refresh",
        refreshActiveClass: "active"
    };

    var extractCount = 0;
    var fsRoot = null;

    function requestZip() {
        requestFileSystem(LocalFileSystem.PERSISTENT, 0, successRequestFileSystem, failRequestFileSystem);
        
        function successRequestFileSystem(fs) {
            fsRoot = fs.root;
            console.log("Requesting file " + options.zipUrl);
            var reader = new zip.HttpReader(options.zipUrl);
            zip.createReader(reader, extractZip, failCreateReader);
        }
        
        function failRequestFileSystem() {
            console.error("Couldn't access the local file system");
        }
        
        function failCreateReader() {
            console.warn("Cannot retrieve ZIP file from URL " + options.zipUrl + "\nWill try to access earlier version of file.");
            openFile();
        }
    }

    function extractZip(reader) {
        console.log("Extracting downloaded ZIP file");
        reader.getEntries(function (entries) {
            entries.forEach(function (entry) {
                console.log("1 entries.forEach " + entry.filename);
                if (!entry.directory && options.ignoredFiles.exec(entry.filename) == null) {
                    console.log("2 entries.forEach " + entry.filename);
                    extractFile(entry);
                } else {
                    console.log("Ignored entry " + entry.filename);
                }
            });
        });
    }

    function extractFile(entry) {
        extractCount++;
        createPath(entry.filename);
        
        fsRoot.getFile(entry.filename, { create: true }, successCreateFile, failCreateFile);
        
        function successCreateFile(file) {
            file.createWriter(function (fileWriter) {
                console.log("Extracting fileeeeeeeeee " + entry.filename);
                //var zipWriter = new zip.TextWriter();
                var zipWriter = new zip.FileWriter(file, zip.getMimeType(entry.filename));
                entry.getData(zipWriter, function (text) {
                    //fileWriter.write(text); // comment if using zip.FileWriter
                    successWroteFile();
                });
            });
        }
        
        function successWroteFile() {
            if (--extractCount <= 0) {
                openFile();
            }
        }
        
        function failCreateFile() {
            console.error("Couldn't create file " + entry.filename);
        }
    }
    
    function createPath(filename) {
        var parentDirectories = filename.split("/");
        for (var i = 0, l = parentDirectories.length - 1; i < l; ++i) {
            (function () { // Create a closure for the path variable to be correct when logging it
                var path = parentDirectories.slice(0, i+1).join("/");
                fsRoot.getDirectory(path, { create: true, exclusive: true }, function () {
                    console.log("Created directory " + path);
                });
            })();
        }
    }
    
    function openFile() {
        var file = fsRoot.fullPath + "/" + options.openFile;
        console.log("Redirecting to file " + file);
        $(options.selectorIframe).attr("src", file);
        
    }
    
    function setDefaultOptions(options, defaults) {
        for (var d in defaults) {
            if (typeof options[d] === "undefined") {
                options[d] = defaults[d];
            }
        }
    }
    
    console.log("Content Sync");
    setDefaultOptions(options, defaults);
    zip.workerScriptsPath = options.workerScriptsPath;
    
    if (options.zipUrl) {
        requestZip();
    } else {
        console.error("Missing argument: options.zipUrl needs to provide the URL of the ZIP file to download.");
    }
    
    $(options.selectorRefresh).on("click", function () {
        var button = $(this);
        var location = $(options.selectorIframe)[0].contentWindow.location.href; // get the URL of the page in the iframe
        var rootPath = encodeURIComponent(fsRoot.fullPath).replace(/%2F/g, "/"); // hack to URL-encode everything but not slashes
        location = location.substr(location.indexOf(rootPath) + rootPath.length);
        
        if (!button.hasClass(options.refreshActiveClass)) {
            options.openFile = location;
            console.log("iframe path is " + $(options.selectorIframe)[0].contentWindow.location.href);
            console.log("root path is " + rootPath);
            console.log("Setting file redirection to  " + location);
            contentSync(options);
            button.addClass(options.refreshActiveClass);
            setTimeout(function () {
                button.removeClass(options.refreshActiveClass);
            }, 1000);
        }
    });
}


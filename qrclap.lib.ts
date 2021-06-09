const { ipcMain, remote } = require("electron");
const path = require('path');
var appRootDir = require("app-root-dir").get();
const os = require("os");
const fs = require("fs");
const fsExtra = require('fs-extra')
const ffmpeg =
    (os.type() === "Windows_NT"
        ? appRootDir + "/node_modules/ffmpeg-static/ffmpeg.exe"
        : os.type() === "Darwin"
            ? appRootDir + "/node_modules/ffmpeg-static/ffmpeg"
            : "").replace(/\\/g, "/");
const genThumbnail = require("simple-thumbnail");
const getFiles = require('node-recursive-directory');
const { getVideoDurationInSeconds } = require("get-video-duration");
const https = require('https');
const http = require('http');
const { shell } = require('electron');
const ncp = require('ncp').ncp;
const md5File = require('md5-file');
const copydir = require('copy-dir');
const rootPath = require('electron-root-path').rootPath;
const cpy = require('cpy');

ncp.limit = 16;

const URL_API = "http://api.qrclap.com:8080/"
const HOST_API = "api.qrclap.com"
const PORT_API = 8080
const URL_WORDPRESS = "https://qrclap.com/"
const HOST_WORDPRESS = "qrclap.com"
const APP_NAME = "QRClap"

var folderToAnalyse = "";
var projectName = "";
var token = "";
var inProgress = false;
var nbProcess = 0;
var nbMaxProcess = 4;
var isStartProcessThumbnail = false;
var fileNotFound = [];
var startTime = 0;
var fileToProcess = {
    files: [],
    fileToProcess: 0,
    nbFileToProcess: 0,
    nbQRToProcess: 0,
    nbFileTotalToProcess: 0,
    nbImageTotalToProcess: 0,
    nbQRTotalToProcess: 0,
};
var whiteList = [".mxf", ".mp4", ".mov", ".mts", ".avi", ".3gp", ".mpg", ".mkv"];
var seekList = [
    {
        time: "00:00:00",
        endOfFile: false,
    },
    /*{
        time: "00:00:01",
        endOfFile: false,
    },
    {
        time: "00:00:02",
        endOfFile: false,
    },
    {
        time: "00:00:03",
        endOfFile: false,
    },*/
    {
        time: "00:00:04",
        endOfFile: false,
    },
    {
        time: "-00:00:01",
        endOfFile: true,
    },
];

function createdDate(file) {
    const { mtime } = fs.statSync(file)
    return mtime
}

ipcMain.on("cancel-analyse-folder", (event, arg) => {
    inProgress = false;
    if (idProject != -1) {
        deleteProject(idProject);
    }
});

var deleteProject = (id) => {
    httpRequest({
        host: HOST_API,
        port: PORT_API,
        data: null,
        method: "DELETE",
        path: "/qrclap/removeproject/" + id,
        token: token
    }).then((project) => { });
}

ipcMain.on("analyse-folder", (event, arg) => {
    event.reply(
        "debug",
        "ok0"
    );
    if (!inProgress) {
        idProject = -1;
        startTime = Date.now();
        nbProcess = 0;
        event.reply(
            "onComplete",
            {
                message:
                    "Analyse in process with " + nbMaxProcess + " process, please wait.."
                , type: "init"
            }
        );
        event.reply(
            "debug",
            "ok1"
        );
        fileToProcess = {
            files: [],
            fileToProcess: 0,
            nbFileToProcess: 0,
            nbQRToProcess: 0,
            nbFileTotalToProcess: 0,
            nbImageTotalToProcess: 0,
            nbQRTotalToProcess: 0,
        };
        folderToAnalyse = arg.folderToAnalyse;
        projectName = arg.projectName;
        token = arg.token;
        getFiles(folderToAnalyse, true).then((files) => {
            event.reply(
                "debug",
                "ok2"
            );
            for (const elem of files) {
                elem.createdDate = createdDate(elem.fullpath);
            }
            files.sort(function (a, b) {
                return a.createdDate.getTime() > b.createdDate.getTime() ? 1 : -1
            });
            files.forEach((file) => {
                var contain = false;
                for (const ext of whiteList) {
                    if (
                        file.fullpath
                            .substr(file.fullpath.length - 4, 4)
                            .toLowerCase()
                            .includes(ext)
                    ) {
                        contain = true;
                        break;
                    }
                }
                if (contain) {
                    fileToProcess.nbFileToProcess++;
                    fileToProcess.nbFileTotalToProcess++;
                    fileToProcess.nbImageTotalToProcess += seekList.length;
                    fileToProcess.files.push({
                        path: file.fullpath,
                        relativePath: file.fullpath.replaceAll(folderToAnalyse.replace(/\\/g, "/"), ""),
                        images: [],
                        QRi: 0,
                        createdDate: file.createdDate,
                        newNameFind: false,
                    });
                }
            });
            fileNotFound = [];
            fileToProcess.fileToProcess = 0;
            fileToProcess.nbQRTotalToProcess = 0;
            fileToProcess.nbQRToProcess = 0;
            inProgress = true;
            isStartProcessThumbnail = true;
            event.reply(
                "debug",
                "ok3"
            );
            for (var i = 0; i < nbMaxProcess; i++) {
                startProcessThumbnail(event);
            }
        });
    }
});

var startProcessThumbnail = (event) => {
    event.reply(
        "debug",
        "ok4"
    );
    if (!inProgress) {
        return;
    }
    if (nbProcess >= nbMaxProcess && isStartProcessThumbnail) {
        setTimeout(() => startProcessThumbnail(event), 1000);
        event.reply(
            "debug",
            "ok5"
        );
    } else if (isStartProcessThumbnail) {

        event.reply(
            "debug",
            "ok6"
        );
        if (fileToProcess.nbFileToProcess <= 0) {
            return;
        }
        var fileIte = fileToProcess.fileToProcess;
        if (fileToProcess.files[fileIte].QRi >= seekList.length) {
            return;
        }
        nbProcess++;
        var elem = seekList[fileToProcess.files[fileIte].QRi++];

        event.reply(
            "debug",
            "ok7"
        );
        try {
            new Promise((resolve) => {

                event.reply(
                    "debug",
                    "ok8"
                );
                const qriTmp = fileToProcess.files[fileIte].QRi;
                getVideoDurationInSeconds(fileToProcess.files[fileIte].path)
                    .then((duration) => {
                        event.reply(
                            "debug",
                            "ok9"
                        );
                        fileToProcess.files[fileIte].duration = duration;
                        var timeSeek = elem.time;
                        var endOfFile = elem.endOfFile;
                        var timeSplit = elem.time.replace("-", "").split(":");
                        var seekSecond =
                            +timeSplit[0] * 3600 + (+timeSplit[1]) * 60 + timeSplit[2];
                        if (+seekSecond >= duration) {
                            timeSeek = "00:00:00";
                            endOfFile = false;
                        }
                        var time = Date.now() + "-" + Math.round(Math.random() * 50000);
                        var dir = os.tmpdir() + "/QRClap/" + projectName;
                        dir = dir.replace(/\\/g, "/");
                        if (!fs.existsSync(os.tmpdir() + "/QRClap")) {
                            fs.mkdirSync(os.tmpdir() + "/QRClap");
                        }
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir);
                        }
                        var fileImage = dir + "/" + time + ".jpg";
                        event.reply(
                            "debug",
                            "ok10"
                        );
                        genThumbnail(
                            fileToProcess.files[fileIte].path,
                            fileImage,
                            "1920x?",
                            endOfFile,
                            {
                                path: ffmpeg,
                                seek: timeSeek,
                            }
                        )
                            .catch((error) => {
                                console.log(error);
                                event.reply(
                                    "debug",
                                    error
                                );
                            })
                            .then(() => {
                                event.reply(
                                    "debug",
                                    "ok11"
                                );
                                fileToProcess.files[fileIte].images.push({ path: fileImage, order: qriTmp, relativePath: fileImage.replace(os.tmpdir().replace(/\\/g, "/"), "") });
                                fileToProcess.nbQRToProcess++;
                            })
                            .finally(() => {
                                resolve(null);
                            });
                    })
                    .catch((error) => {
                        event.reply(
                            "debug",
                            error
                        );
                    })
                    .finally(() => {
                        resolve(null);
                    });
            }).finally(() => {
                event.reply(
                    "debug",
                    "ok12"
                );
                fileToProcess.nbImageTotalToProcess--;
                if (fileToProcess.nbImageTotalToProcess == 0) {
                    event.reply(
                        "onComplete",
                        {
                            message: "Start processus QR analyze.."
                            , type: "qr"
                        }
                    );
                    setTimeout(() => {
                        fileToProcess.nbQRTotalToProcess = fileToProcess.nbQRToProcess;
                        nbProcess = 0;
                        fileToProcess.nbFileToProcess = fileToProcess.nbFileTotalToProcess;
                        fileToProcess.fileToProcess = 0;
                        sendQRToAnalyse(event);
                    }, 2000);
                } else if (isStartProcessThumbnail) {
                    if (fileToProcess.files[fileIte].QRi == seekList.length) {
                        fileToProcess.files[fileIte].QRi = 0;
                        fileToProcess.fileToProcess++;
                        nbProcess--;
                        fileToProcess.nbFileToProcess--;
                        if (fileToProcess.nbFileToProcess > 0) {
                            startProcessThumbnail(event);
                        }
                    } else {
                        startProcessThumbnail(event);
                        nbProcess--;
                    }
                    event.reply(
                        "onComplete",
                        {
                            message:
                                "Calcul QR Thumbnail (" +
                                (fileToProcess.nbFileTotalToProcess -
                                    fileToProcess.nbFileToProcess) +
                                " / " +
                                fileToProcess.nbFileTotalToProcess +
                                ")"
                            , type: "thumbnail"
                        }
                    );
                }
            });
        } catch (error) {
            event.reply(
                "debug",
                error
            );
        }
    }
};

var projectReturnedI = 0;
var projectReturnedQRI = 0;
var projectReturned;
var idProject = -1;
var sendQRToAnalyse = (event) => {
    if (!inProgress) {
        return;
    }
    projectReturnedI = 0;
    projectReturnedQRI = 0;
    const project = {
        name: projectName,
        files: []
    }
    for (const elem of fileToProcess.files) {
        const splitName = elem.relativePath.split("/");
        project.files.push({
            relativePath: elem.relativePath,
            createdDate: elem.createdDate,
            duration: typeof elem.duration == "undefined" ? 0 : elem.duration,
            type: elem.images.length == 0 ? 2 : 0,
            nameBeforeRename: splitName[splitName.length - 1]
        });
    }
    sendProject(project, event).then((projectIsReturned) => {
        if (!inProgress) {
            deleteProject(projectReturned.id);
            return;
        }
        projectReturned = projectIsReturned;
        idProject = projectReturned.id;
        var imageFind = false;
        for (const fileReturned of projectReturned.files) {
            for (const file of fileToProcess.files) {
                if (fileReturned.relativePath == file.relativePath) {
                    fileReturned.images = file.images;
                    fileReturned.images.sort(function (a, b) {
                        return a.order > b.order ? 1 : -1
                    });
                }
            }
        }
        for (const file of projectReturned.files) {
            if (file.type == 0) {
                imageFind = true;
                sendQR(file, file.images[0], event)
                    .catch((error) => {
                        console.log(error);
                    })
                    .finally(() => {
                        finishProcess(event);
                    })
            } else {
                projectReturnedI++;
            }
            if (imageFind) break;
        }
        if (!imageFind) {
            finishProcess(event);
        }
    }).catch((error) => {
        console.log(error);
    });
}

var sendProject = (project, event) => {
    return new Promise((resolve, error) => {
        event.reply("onComplete", {
            message: "Send project to server.."
            , type: "sendProject"
        });
        const projectJson = JSON.stringify(project);
        const options = {
            hostname: HOST_API,
            port: PORT_API,
            path: '/qrclap/createproject',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': projectJson.length,
                "Authorization": "Bearer " + token
            }
        }

        const req = http.request(options, res => {
            var body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode == 200) {
                    resolve(JSON.parse(body));
                } else {
                    error(res);
                }
            });
        })

        req.on('error', error => {
            console.error(error)
        })

        req.write(projectJson)
        req.end()
    });
}

var sendQR = (file, qr, event, resolveMain = null) => {
    return new Promise((resolve, error) => {
        if (!resolveMain) {
            resolveMain = resolve;
        }
        event.reply("onComplete", {
            message: "Send QR Image To Server.."
            , type: "sendQR"
        });
        const imageJson = JSON.stringify({
            relativePath: qr.relativePath,
            type: 0,
            dataBase64: Buffer.from(fs.readFileSync(qr.path), 'binary').toString('base64'),
            dataContentType: "jpg",
            file: { id: file.id }
        });
        const options = {
            hostname: HOST_API,
            port: PORT_API,
            path: '/qrclap/scanqr',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': imageJson.length,
                "Authorization": "Bearer " + token
            }
        }

        const req = http.request(options, res => {
            if (!inProgress) {
                resolveMain(null);
                return;
            }
            var body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode == 200) {
                    const newImage = JSON.parse(body);
                    if (newImage.type == 0) {
                        goToNextImage();
                    } else if (newImage.type == 1) {
                        goToNextFile();
                    }
                    if (projectReturnedI == -1) {
                        resolveMain(newImage);
                    } else {
                        sendQR(projectReturned.files[projectReturnedI], projectReturned.files[projectReturnedI].images[projectReturnedQRI], event, resolveMain)
                    }
                } else {
                    error(res);
                }
            });
        })

        req.on('error', error => {
            console.error(error)
        })

        req.write(imageJson)
        req.end()
    });
}

var goToNextImage = () => {
    projectReturnedQRI++;
    if (projectReturned.files[projectReturnedI].images.length <= projectReturnedQRI) {
        goToNextFile();
    }
}

var goToNextFile = () => {
    projectReturnedQRI = 0;
    projectReturnedI++;
    while (projectReturned.files.length > projectReturnedI && projectReturned.files[projectReturnedI].type == 2) {
        projectReturnedI++;
    }
    if (projectReturned.files.length <= projectReturnedI) {
        projectReturnedI = -1;
    }
}

var clearTmp = () => {
    for (const elem of fileToProcess.files) {
        for (const img of elem.images) {
            fs.unlinkSync(img.path);
        }
    }
}

var finishProcess = (event) => {
    if (!inProgress) {
        return;
    }
    // clearTmp();
    var time = Math.round((Date.now() - startTime) / 10) / 100;
    var msg = "Analyse complete in " + time + "s";
    if (fileNotFound.length == 0) {
        msg += " successfully !";
    } else {
        msg +=
            " but with " +
            fileNotFound.length +
            (fileNotFound.length > 1 ? " files" : " file") +
            " that need to be rename manually:";
        fileNotFound.forEach((file) => {
            msg += "</br>" + file;
        });
    }
    event.reply("onComplete", {
        message: msg,
        type: "finish",
        idProject: idProject
    });
    inProgress = false;
};

ipcMain.on("http-request", (event, arg) => {
    httpRequest(arg, event);
});

var httpRequest = (arg, event = null) => {
    return new Promise((resolve, error) => {
        const headers = {
            'Content-Type': 'application/json'
        }
        var dataJson = null;
        if (arg.data != null) {
            dataJson = JSON.stringify(arg.data);
            headers['Content-Length'] = dataJson.length;
        }
        if (arg.token != null) {
            headers['Authorization'] = "Bearer " + arg.token;
        }
        const options = {
            hostname: arg.host,
            port: arg.port,
            path: arg.path,
            method: arg.method,
            headers: headers
        }

        var httpSender = http;
        if (arg.port == 443) {
            httpSender = https;
        }

        const req = httpSender.request(options, res => {
            var body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode == 200) {
                    if (event != null) {
                        event.reply(arg.successIdRequest, JSON.parse(body));
                    }
                    resolve(JSON.parse(body));
                } else {
                    if (event != null) {
                        event.reply(arg.errorIdRequest, res.statusCode);
                    }
                    error(res.statusCode);
                }
            });
        })

        req.on('error', httpError => {
            if (event != null) {
                event.reply(arg.errorIdRequest, httpError.code);
            }
            error(httpError.code);
        });
        if (dataJson != null) {
            req.write(dataJson);
        }
        req.end();
    });
}

ipcMain.on("save-base64-image-disk", (event, arg) => {
    createTmpPath(arg.projectName);
    fs.writeFile(os.tmpdir() + arg.path, arg.base64Data, 'base64', function (err) {
        event.returnValue = err;
        console.log(err);
    });
});

const createTmpPath = (projectName) => {
    var dir = os.tmpdir() + "/QRClap/" + projectName;
    dir = dir.replace(/\\/g, "/");
    if (!fs.existsSync(os.tmpdir() + "/QRClap")) {
        fs.mkdirSync(os.tmpdir() + "/QRClap");
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
};

ipcMain.on("get-image-data", (event, arg) => {
    createTmpPath(arg.projectName);
    var fileImage = os.tmpdir() + arg.relativePath;
    if (fs.existsSync(fileImage)) {
        event.returnValue = base64_encode(fileImage);
    } else {
        event.returnValue = "";
    }
});

var base64_encode = (file) => {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return Buffer.from(bitmap).toString('base64');
}

ipcMain.on("open-directory", (event, arg) => {
    if (os.type() === "Windows_NT") {
        shell.showItemInFolder(arg.replaceAll("/", "\\"));
    } else {
        shell.showItemInFolder(arg.replaceAll("\\", "/"));
    }
});

var GenerateRandomName = () => {
    return ("TMP_NAME_QRCLAP_RENAME_" + Math.round(Math.random() * 10000000) + "_" + Math.round(Math.random() * 10000000) + "_" + Math.round(Math.random() * 10000000));
}

var getRelativePath = (path) => {
    const split = path.split("/");
    return path.replace(split[split.length - 1], "");
}

var getExtFile = (file) => {
    const split = file.split(".");
    return "." + split[split.length - 1];
}

ipcMain.on("rename-files", (event, arg) => {
    const project = JSON.parse(JSON.stringify(arg.project));
    const isRenamedProject = arg.project.state == 1 && !arg.forceBaseRename;
    arg.project.state = 1;
    for (const file of arg.project.files) {
        if (file.tmpName != null && typeof file.tmpName != "undefined" && file.tmpName != "") {
            file.finalName = file.tmpName;
        }
    }
    httpRequest({
        host: HOST_API,
        port: PORT_API,
        data: arg.project,
        method: "POST",
        path: "/qrclap/renamefiles",
        token: arg.token
    }).then((p) => {
        renameFilesProjectFolder(project, isRenamedProject, arg.folderToAnalyse)
        event.reply("rename-file-finished", project);
    });
});

ipcMain.on("rename-local-files", (event, arg) => {
    renameFilesProjectFolder(arg.project, false, arg.folderToAnalyse);
    event.returnValue = arg.project;
});

const renameFilesProjectFolder = (project, isRenamedProject, folderToAnalyse) => {
    const duplicateNameProtection = [];
    for (const file of project['files']) {
        if (file.type == 0 || file.type == 3) {
            const extension = getExtFile(file.nameBeforeRename);
            const fileName = isRenamedProject ? file.finalName + extension : file.nameBeforeRename;
            const fileRelativePath = getRelativePath(file.relativePath) + fileName;
            if (fs.existsSync(folderToAnalyse + fileRelativePath)) {
                const relativePath = file.relativePath.replace(file.nameBeforeRename, "");
                file.nameBeforeRename = GenerateRandomName();
                while (duplicateNameProtection.includes(file.nameBeforeRename)) {
                    file.nameBeforeRename = GenerateRandomName();
                }
                file.nameBeforeRename += extension;
                fs.renameSync(folderToAnalyse + fileRelativePath, folderToAnalyse + relativePath + file.nameBeforeRename);
                file.relativePath = relativePath + file.nameBeforeRename;
            }
        }
    }
    for (const file of project['files']) {
        if (file.type == 0 || file.type == 3) {
            if (fs.existsSync(folderToAnalyse + file.relativePath)) {
                const splitName = file.nameBeforeRename.split(".");
                const extension = "." + splitName[splitName.length - 1];
                const relativePath = file.relativePath.replace(file.nameBeforeRename, "");
                var name = file.finalName;
                if (isRenamedProject && file.tmpName != null && typeof file.tmpName != "undefined" && file.tmpName != "") {
                    name = file.tmpName;
                }
                fs.renameSync(folderToAnalyse + file.relativePath, folderToAnalyse + relativePath + name + extension);
            } else {
                //TODO: Handle error case if old file is not present
            }
        }
    }
}

ipcMain.on("get-saved-param", (event, arg) => {
    var json = getOrCreateSavedParam();
    event.returnValue = json;
    return;
});

ipcMain.on("set-saved-param", (event, arg) => {
    fs.writeFileSync(jsonLocation, JSON.stringify(arg));
    event.returnValue = {};
    return;
});

const jsonLocation = path.join(rootPath, 'save-param.json');
var getOrCreateSavedParam = () => {
    if (!fs.existsSync(jsonLocation)) {
        fs.writeFileSync(jsonLocation, "{}");
    }
    return JSON.parse(fs.readFileSync(jsonLocation));
}

ipcMain.on("list-file-folder", (event, arg) => {
    getFiles(arg, true).then((files) => {
        event.returnValue = files;
    });
});


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

ipcMain.on("backup-folder", async (event, arg) => {
    const source = arg.source;
    const destinations = arg.destinations;
    const filter = arg.filter;
    // const statToSend = {
    //     current: 0,
    //     total: 0,
    //     filename: ""
    // }
    // const filterFunc = (src, dest) => {
    //     if (fs.lstatSync(src).isFile()) {
    //         statToSend.current++;
    //         statToSend.filename = src.replaceAll("\\", "/").replace(source.replaceAll("\\", "/"), "");
    //         event.reply("backup-folder-status", statToSend);
    //         return typeof filter == "undefined" || filter.length == 0 || filter.includes(dest.replaceAll("\\", "/"));
    //     } else {
    //         return true;
    //     }
    // }
    getFiles(source, false).then(async (sourceFiles) => {
        var totalSize = 0;
        var totalDone = 0;
        for (var i = 0; i < destinations.length; i++) {
            const destination = destinations[i];
            const fileList = [];
            for (const sourceFile of sourceFiles) {
                if (typeof filter == "undefined" || filter.length == 0 || filter.includes(sourceFile.replace(source.replaceAll("\\", "/"), destination.replaceAll("\\", "/")).replaceAll("\\", "/"))) {
                    fileList.push(sourceFile);
                }
            }
            if (fileList.length != 0) {
                for (const file of fileList) {
                    totalSize += getFilesizeInBytes(file);
                }
            }
        }
        for (var i = 0; i < destinations.length; i++) {
            try {
                const destination = destinations[i];
                const fileList = [];
                for (const sourceFile of sourceFiles) {
                    if (typeof filter == "undefined" || filter.length == 0 || filter.includes(sourceFile.replace(source.replaceAll("\\", "/"), destination.replaceAll("\\", "/")).replaceAll("\\", "/"))) {
                        fileList.push(sourceFile.replaceAll("\\", "/"));
                    }
                }
                if (fileList.length != 0) {
                    var totalFolder = 0;
                    var totalFolderDone = 0;
                    for (const file of fileList) {
                        totalFolder += getFilesizeInBytes(file);
                    }
                    for (const fileToProcess of fileList) {
                        const relative = fileToProcess.replaceAll("\\", "/").replace(source.replaceAll("\\", "/"), "");
                        const file = relative.split("/");
                        const destinationFolder = destination.replaceAll("\\", "/") + relative.replace(file[file.length - 1], "").replaceAll("\\", "/");
                        fs.mkdir(destinationFolder, { recursive: true }, (err) => {
                            if (err) throw err;
                        });
                        await cpy([fileToProcess], destinationFolder).on('progress', progress => {
                            event.reply("backup-folder-status", { ...progress, totalSize: totalSize, folder: destination, folderActual: i + 1, folderTotal: destinations.length, totalDone: totalDone, totalFolder: totalFolder, totalFolderDone: totalFolderDone });
                        });
                        totalDone += getFilesizeInBytes(fileToProcess);
                        totalFolderDone += getFilesizeInBytes(fileToProcess);
                    }
                }
            } catch (error) {
                console.log(error);
                i--;
                await sleep(1000);
            }
        }
        event.reply("backup-complete", null);
        console.log('done!');
    });
});

var getRelativePathFolder = (path, parent) => {
    return path.replace(parent, "");
}

ipcMain.on("compare-folder", async (event, arg) => {
    const source = arg.source.replaceAll("\\", "/");
    const destinations = arg.destinations;
    const filter = arg.filter;
    for (var i = 0; i < destinations.length; i++) {
        destinations[i] = destinations[i].replaceAll("\\", "/");
    }
    const md5Source = {};
    const md5Destination = {};
    const stat = {
        current: 0,
        total: 0,
        filename: ""
    }
    const sourceFiles = await getFiles(source, false);
    stat.total = sourceFiles.length;
    for (const destination of destinations) {
        const destinationFiles = await getFiles(destination, false);
        stat.total += destinationFiles.length;
    }
    for (const sourceFile of sourceFiles) {
        stat.current++;
        event.reply("compare-folder-status", stat);
        if (typeof filter == "undefined" || filter.length == 0 || filter.includes(sourceFile))
            md5Source[getRelativePathFolder(sourceFile, source)] = {
                md5: fs.statSync(sourceFile).size, //md5File.sync(destinationFile)
                path: sourceFile.replaceAll("\\", "/")
            };
    }
    for (const destination of destinations) {
        md5Destination[destination] = {};
    }
    for (const destination of destinations) {
        const destinationFiles = await getFiles(destination, false);
        for (const destinationFile of destinationFiles) {
            stat.current++;
            event.reply("compare-folder-status", stat);
            if (typeof filter == "undefined" || filter.length == 0 || filter.includes(destinationFile))
                md5Destination[destination][getRelativePathFolder(destinationFile, destination)] = {
                    md5: fs.statSync(destinationFile).size, //md5File.sync(destinationFile)
                    path: destinationFile.replaceAll("\\", "/")
                };
        }
    }
    event.reply("compare-folder-completed", {
        md5Source: md5Source,
        md5Destination: md5Destination
    });
    /*for (const sourceFile of sourceFiles) {
        md5Source[sourceFile] = md5File.sync('F:/Dropbox/CameraQRCode/LecteurElectron/TestFolder - Copie/S01_P01_P01.mov')
    }
    ncp(source, destinations[0], function (err) {
        event.reply("backup-complete", err);
        if (err) {
            return console.error(err);
        }
        console.log('done!');
    });*/
});

ipcMain.on("export-file-backup-rename", async (event, arg) => {
    const filePath = arg.filePath.replaceAll("\\", "/");
    const data = arg.data;
    console.log(filePath);
    console.log(data);
    fs.writeFileSync(filePath, JSON.stringify(data));
    event.returnValue = "";
});

ipcMain.on("import-file-backup-rename", async (event, arg) => {
    let rawdata = fs.readFileSync(arg.filePath.replaceAll("\\", "/"));
    let backupRenameData = JSON.parse(rawdata);
    console.log(backupRenameData);
    event.returnValue = backupRenameData;
});

ipcMain.on("get-arg-process", (event, arg) => {
    event.returnValue = process.argv;
})
//Bureau
const { askForContactsAccess, askForFoldersAccess, askForFullDiskAccess } = require('node-mac-permissions')
ipcMain.on("check-mac-permission", (event, arg) => {
    checkAccess();
})

const checkAccess = () => {
    if (os.type() === "Darwin") {
        askForFullDiskAccess();
    }
}
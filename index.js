const express = require('express')
const session = require('express-session')
const dotenv = require('dotenv')
const mongodb = require('mongoose')
var mongoClient = require('mongodb').MongoClient;
const authroute = require('./router/auth.route')
const passport = require('passport')
const fileupload = require('express-fileupload')
const fs = require('fs')
const router = express.Router()
const binary = mongodb.Binary
const sdk = require("microsoft-cognitiveservices-speech-sdk");

require('./auth');
dotenv.config()
function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401)
}
const app = express()
app.use(session({ secret: process.env.CODE }))
app.use(passport.initialize())
app.use(passport.session())
app.use(fileupload())

app.get('/', (req, res) => {
    res.send('<center><h1><b>WELCOME</b></h1><br><button><a href="/auth/google">Login</a></button></center> ')
})
app.get('/auth/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
)
app.get('/google/callback',
    passport.authenticate('google', {
        successRedirect: '/protected',
        failureRedirect: '/auth/failure',
    })
)
app.get('/auth/failure', (req, res) => {
    res.send('something went wrong')
})
app.get('/protected', isLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/index.html')
})
app.post('/upload', isLoggedIn, (req, res) => {
    if (req.files) {
        console.log(req.file)
    }
    var file = { username: req.user.displayName, file: req.files.uploadedFile }
    //var file = binary(req.files.uploadedFile.data)  
    insertFile(file, res)
})
async function insertFile(file, res) {
    mongoClient.connect(process.env.MONGO, (err, client) => {
        if (err) {
            return err
        }
        else {
            let db = client.db('uploadDB')
            let collection = db.collection('files')
            try {
                collection.insertOne(file)
                console.log('File Inserted')
            }
            catch (err) {
                console.log('Error while inserting:', err)
            }
            res.redirect('/protected')
        }
    })
    await client.close()

}
app.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy();
    res.send('You have been Logged out')
})


// replace with your own subscription key,
// service region (e.g., "westus"), and
// the name of the file you want to run
// through the speech recognizer.
const subscriptionKey = process.env.ID;
const serviceRegion = process.env.LOCATION; // e.g., "westus"
const filename="audio.wav";
const language = "en-US";

// function openPushStream(filename) {
//     // create the push stream we need for the speech sdk.
//     var pushStream = sdk.AudioInputStream.createPushStream();
  
//     // open the file and push it to the push stream.
//     fs.createReadStream(filename)
//       .on("data", function (arrayBuffer) {
//         pushStream.write(arrayBuffer.slice());
//       })
//       .on("end", function () {
//         pushStream.close();
//       });
  
//     return pushStream;
//   }
  
//   var audioConfig = sdk.AudioConfig.fromStreamInput(
//     openPushStream("audio.wav")
//   );
//   var speechConfig = sdk.SpeechConfig.fromSubscription(
//     subscriptionKey,
//     serviceRegion
//   );
//   speechConfig.speechRecognitionLanguage = language;
//   var recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
//   recognizer.recognizeOnceAsync(
//     function (result) {
//       console.log(result.text);
//       recognizer.close();
//       //recognizer = undefined;
//     },
//     function (err) {
//       console.log(err);
//       recognizer.close();
//       //recognizer = undefined;
//     });

// const fs = require('fs');
// const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey,serviceRegion);

function fromFile() {
    let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("audio.wav"));
    let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(result => {
        console.log(`RECOGNIZED: Text=${result.text}`);
        recognizer.close();
    });
}
fromFile();
mongodb.connect(process.env.MONGO, () => console.log('mongodb connected'))
// app.use('/', (req, res) => res.send("hello world"))
app.use('/auth', authroute)
app.listen(process.env.PORT, () => console.log(`server is running ${process.env.PORT}`))
module.exports = router
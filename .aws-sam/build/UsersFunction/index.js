/**
 * A Lambda function that returns a static string
 */
const AWS = require('aws-sdk');
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18', region: 'us-east-2'});
const docClient = new AWS.DynamoDB.DocumentClient();
const AWSCognitoIdentity = new AWS.CognitoIdentity();
AWS.config.logger = console;

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

function uploadToS3(eventBody) {
    return new Promise((resolve, reject) => {

        const myBuffer = Buffer.from(eventBody.avatarBase64, 'base64');
        
        var uploadParams = {
            Bucket: 'foodsta-avatars',
            Key: `avatars/${eventBody.username}/2020/${eventBody.username}${eventBody.contentType}`,
            Body: myBuffer,
            ContentType: `image/${eventBody.contentType}`,
            ACL: 'public-read'
        };
        console.log(uploadParams);
        s3.upload(uploadParams).promise().then(item => {
            console.log("Items ", item.Location);
            resolve(item.Location);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
    })
}

function signUp(eventBody) {

    return new Promise((resolve, reject) => {
        var params = {
            ClientId: '5rg8of6gumbi9i0678c0iaf2ne',
            Username: eventBody.username,
            Password: eventBody.password,
        }

        cognitoidentityserviceprovider.signUp(params).promise().then(
            data => {
                console.log("Data ", data)
                resolve(data)
            }).catch(err => {
                console.log(err);
                reject(err)
            })  
    })
}

function signUpConfirmation(eventBody) {

    return new Promise((resolve, reject) => {
        var params = {
            UserPoolId: 'us-east-2_dqcgp89tN',
            Username: eventBody.username,
        }

        cognitoidentityserviceprovider.adminConfirmSignUp(params).promise().then(
            data => {
                console.log("Data ", data)
                resolve(data)
            }).catch(err => {
                console.log(err);
                reject(err)
            })  
    })
}

function login(eventBody){
    return new Promise((resolve, reject) => {
        var params = {
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            ClientId: '5rg8of6gumbi9i0678c0iaf2ne',
            AuthParameters: {
                "USERNAME": eventBody.username,
                "PASSWORD": eventBody.password,
            },
            UserPoolId: 'us-east-2_dqcgp89tN'
        }

        cognitoidentityserviceprovider.adminInitiateAuth(params).promise().then(
            data => {
                console.log("Data ", data)
                resolve(data)
            }).catch(err => {
                console.log(new Error(err));
                reject(err)
            })
    })
}

function logout(eventBody){
    return new Promise((resolve, reject) => {
        var params = {
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            ClientId: '5rg8of6gumbi9i0678c0iaf2ne',
            AuthParameters: {
                "USERNAME": eventBody.username,
                "PASSWORD": eventBody.password,
            },
            UserPoolId: 'us-east-2_dqcgp89tN'
        }

        cognitoidentityserviceprovider.adminInitiateAuth(params).promise().then(
            data => {
                console.log("Data ", data)
                resolve(data)
            }).catch(err => {
                console.log(new Error(err));
                reject(err)
            })
    })
}

function getProfilePicture(pathParams){
    return new Promise((resolve, reject) => {
        var params = {
            ExpressionAttributeNames: {
                "#cu":"cognito-username"
            },
            ExpressionAttributeValues: {
                ':hkey': pathParams.username,
            },
            TableName: 'Foodsta-users',
            KeyConditionExpression: `#cu = :hkey`,
            ProjectionExpression: 'profilePicture'
        };
        console.log(params)
        docClient.query(params).promise().then(
            data => {
                console.log("Data ", data);
                resolve(data);
            }).catch(err => {
                console.log(new Error(err));
                reject(err);
            });
    });
}

function saveNewUser(eventBody, avatar){
    return new Promise((resolve, reject) => {
        
        var params = {
            TableName: 'Foodsta-users',
            Item: {
              "cognito-username": eventBody.username,
              "id": uuidv4(),
              "firstname": eventBody.firstname,
              "lastname": eventBody.lastname,
              "email": eventBody.email,
              "profilePicture": avatar
            },
        };
        console.log(params);
        docClient.put(params).promise().then(
            data => {
                console.log("Data ", data);
                resolve(data);
            }).catch(err => {
                console.log(new Error(err));
                reject(err);
        });
        console.log("Test")
        
    });
}

exports.handler = async (event, context) => {

    console.log(event)
    console.log(context)

    let res, newUser, loginRes, confirm, savetoDB, avatar;
    let eventBody = JSON.parse(event.body)

    switch(event.resource){
        case '/users/create':
            newUser = await signUp(eventBody);
            console.log(newUser);
            avatar = await uploadToS3(eventBody);
            console.log(avatar)
            savetoDB = await saveNewUser(eventBody, avatar);
            console.log(savetoDB)
            confirm = await signUpConfirmation(eventBody);
            console.log(confirm)
            res = newUser;
            break;
        case '/users/auth':
            loginRes = await login(eventBody);
            res = { user: eventBody, authResponse: loginRes}
            console.log(res)
            break;
        case '/users/profilePicture/{username}':
            res = await getProfilePicture(event.pathParameters);
            break;
        default:
            res = null
    }
    return {
        "statusCode": res.statusCode,
        "body": JSON.stringify(res),
        "headers": {},
        "isBase64Encoded": false
    };
};

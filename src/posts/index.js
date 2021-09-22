/**
 * A Lambda function that returns a static string
 */
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

AWS.config.update({region: 'us-east-2'});

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

function uploadToS3(request) {
    console.log(request);
    return new Promise((resolve, reject) => {

        const myBuffer = Buffer.from(request.imageBase64, 'base64');
        
        var uploadParams = {
            Bucket: 'foodsta-posts',
            Key: `posts/${request.username}/2020/${request.title}${request.contentType}`,
            Body: myBuffer,
            ContentType: `image/${request.contentType}`
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

function createPost(request, imageUrl){
    return new Promise((resolve, reject) => {
        
        var params = {
            TableName: 'Foodsta-posts',
            Item: {
              'cognito-username': request.username,
              'id': uuidv4(),
              'caption': request.caption,
              'image': imageUrl,
              'title': request.title
            },
        };

        console.log(params);

        docClient.put(params).promise().then(
            data => {
                console.log("Data ", data);
                resolve(data);
            }).catch(err => {
                console.log(err);
                reject(err);
        });
        
    });
}

function scanTable() {
    return new Promise((resolve, reject) => {
      
        const params = {
          TableName: 'Foodsta-posts',
        };
        const scanResults = [];
        
        docClient.scan(params).promise().then(items => {
            items.Items.forEach((item) => scanResults.push(item));
            resolve(scanResults);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
        
        });
};

function addComment(request){
    return new Promise((resolve, reject) => {
        
        var params = {
            TableName: 'Foodsta-commentsTable',
            Item: {
              'cognito-username': request.username,
              'postId': request.postId,
              'commentId': request.commentId,
              'comment': request.text,
            },
        };

        console.log(params);

        docClient.put(params).promise().then(
            data => {
                console.log("Data ", data);
                resolve(data);
            }).catch(err => {
                console.log(err);
                reject(err);
        });
        
    });
}

function getComments(request) {
    console.log(request)
    return new Promise((resolve, reject) => {
        var cognitoUsername = 'cognito-username'
        var param = {
            ExpressionAttributeValues: {
                ':rkey': request.postId,
            },
            TableName: 'Foodsta-commentsTable',
            KeyConditionExpression: `postId = :rkey`,
            IndexName: 'postId-index',
        };

        docClient.query(param).promise().then(items => {
            console.log("Items ", items);
            resolve(items);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
        
        });
};

function getPostsByUsername(pathParams) {
    
    return new Promise((resolve, reject) => {
        var params = {
            ExpressionAttributeNames: {
                "#cu":"cognito-username"
            },
            ExpressionAttributeValues: {
                ':hkey': pathParams.username,
            },
            TableName: 'Foodsta-posts',
            KeyConditionExpression: `#cu = :hkey`,
        };
        docClient.query(params).promise().then(items => {
            console.log("Items ", items);
            resolve(items);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
        
        });
};

exports.handler = async (event, context) => {
    console.log(event)
    console.log(context)

    let request = JSON.parse(event.body)
    
    let res;
    switch(event.resource){
        case '/posts/create':
            let imageS3Url = await uploadToS3(request);
            res = await createPost(request, imageS3Url);
            break;
        case '/posts/getAll':
            res = await scanTable();
            break;
        case '/posts/addComment':
            res = await addComment(request);
            break;
        case '/posts/getComments':
            res = await getComments(request);
            break;
        case '/posts/{username}':
            res = await getPostsByUsername(event.pathParameters)
            break;
        default:
            res = null
    }
    
    return {
        "statusCode": 200,
        "body": JSON.stringify(res),
        "headers": {},
        "isBase64Encoded": false
    };
}

const express = require('express');
const app = express();
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { connected, send } = require('process');
const Nodemailer= require('nodemailer');

app.use(express.static('public'));
app.use(express.urlencoded({extended:false}));
app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false
    })
);
app.use((req,res,next) => {
    const userID = req.session.userID;

    if (userID === undefined) {
        res.locals.username = 'ゲスト';
        res.locals.isLoggedIn = false;
    } else {
        res.locals.username = req.session.username;
        res.locals.isLoggedIn = true;
    }
    next();
});

const connection = mysql.createConnection({
    host: 'us-cdbr-east-04.cleardb.com',
    user: 'bd50186d51bf9f',
    password: 'b810490b',
    database: 'heroku_cab676389153996',
    multipleStatements: true
});

function sendMail(smtpData, mailData) {
    const transporter = Nodemailer.createTransport(smtpData);
    transporter.sendMail(mailData, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent:' + info.response);
        }
    });
}


/* index ----------------------------------- */
app.get('/', (req,res) => {
    connection.query(
        'select * from posts; select * from joins',
        (error, results) => {
            res.render('index.ejs',{posts: results[0], joins: results[1]});
        }
    );
});

app.get('/index', (req,res) => {
    connection.query(
        'select * from posts; select * from joins',
        (error, results) => {
            res.render('index.ejs',{posts: results[0], joins: results[1]});
        }
    );
});

app.post('/join/:id/:email/:name', (req,res) => {
    const join_id = req.params.id;
    const join_name = req.session.username;
    const join_email = req.session.email;

    const email = req.params.email;
    const name = req.params.name;

    connection.query(
        'INSERT INTO joins (join_id,join_name,join_email) VALUES (?,?,?)',
        [join_id,join_name,join_email],
        (error,results) => {
            connection.query(
                'select * from posts',
                (error, results) => {
                    res.redirect('/index');
                }
            );
        }
    );

    function main() {
        const join_name = req.session.username;
        const join_email = req.session.email;
        const email = req.params.email;
        const name = req.params.name;
        const smtpData = {
            host: 'smtp.gmail.com',
            port: '465',
            secure: true,
            auth: {
                user: 'pinpon@gmail.com',
                pass: 'pinpon'
            }
        };
        const mailData = {
            from: '"Pinpoon運営事務局" <' + smtpData.auth.user + '>',
            to: email,
            subject: 'Pinpooon!' + join_name + 'さんが参加しました。',
            text: name + 'さんの予定に' + join_name + 'さんが参加しました。',
        };
        sendMail(smtpData,mailData);
    }
    main();
});



/* about ----------------------------------- */

app.get('/about', (req,res) => {
    res.render('about.ejs')
});

/* create ----------------------------------- */

app.get('/create', (req,res) => {
    res.render('create.ejs')
});

app.post('/create', (req,res) => {
    connection.query(
        'INSERT INTO posts (date,time,title,content,place,purpose,level,name,email) VALUES (?,?,?,?,?,?,?,?,?)',
        [req.body.date,req.body.time,req.body.title,req.body.content,req.body.place,req.body.purpose,req.body.level,req.session.username,req.session.email],
        (error,results) => {
            connection.query(
                'select * from posts',
                (error, results) => {
                    res.redirect('/index');
                }
            );
        }
    );
});

/* login ----------------------------------- */

app.get('/login', (req,res) => {
    res.render('login.ejs')
});

app.post('/login', (req,res) => {
    const email = req.body.email;
    connection.query(
        'select * from users where email = ?',
        [email],
        (error,results) => {
            if (results.length > 0) {
                const plain = req.body.password;
                const hash = results[0].password;
                bcrypt.compare(plain,hash,(error,isEqual) => {
                    if (isEqual) {
                        req.session.userID = results[0].id;
                        req.session.username = results[0].name;
                        req.session.email = results[0].email;
                        res.redirect('/index');
                    } else {
                        res.redirect('login');
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    );
})

/* logout ----------------------------------- */

app.get('/logout', (req,res) => {
    req.session.destroy((error) => {
        res.redirect('/index');
    });
});

/* mypage ----------------------------------- */

app.get('/mypage', (req,res) => {
    connection.query(
        'select * from posts; select * from joins where join_name=?; select * from joins',
        [req.session.username],
        (error, results) => {
            res.render('mypage.ejs',{posts: results[0], join_posts: results[1], joins: results[2]});
        }
    );
});

app.post('/cancel/:id', (req,res) => {
    connection.query(
        'delete from joins where join_name=? and join_id=?',
        [req.session.username,req.params.id],
        (error,results) => {
            res.redirect('/mypage');
        }
    );
});

app.post('/delete/:id', (req,res) => {
    connection.query(
        'delete from posts where id=?',
        [req.params.id],
        (error,results) => {
            res.redirect('/mypage');
        }
    )
});

/* search ----------------------------------- */

app.get('/search', (req,res) => {
    res.render('search.ejs')
});


/* result ----------------------------------- */

app.post('/searcher', (req,res) => {
    connection.query(
        'select * from posts where date=? or place=? or level=?; select * from joins',
        [req.body.date, req.body.place, req.body.level],
        (error, results) => {
            res.render('result.ejs',{posts: results[0], joins: results[1]});
        }
    );
});

/* signup ----------------------------------- */

app.get('/signup', (req,res) => {
    res.render('signup.ejs', {errors: []});
});

app.post('/signup',
(req,res,next) => {
    const username = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];
    if (username === '') {
        errors.push('ニックネームが空です');
    }
    if (email === '') {
        errors.push('メールアドレスが空です');
    }
    if (password === '') {
        errors.push('パスワードが空です');
    }

    if (errors.length > 0) {
        res.render('signup.ejs', {errors: errors});
    } else {
        next();
    }
},
(req,res,next) => {
    const email = req.body.email;
    const errors = [];
    connection.query(
        'select * from users where email = ?',
        [email],
        (error,results) => {
            if (results.length > 0) {
                errors.push('ユーザー登録に失敗しました');
                res.render('signup.ejs', {errors: errors});
            } else {
                next();
            }
        }
    );
},
(req,res) => {
    const username = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error,hash) => {
        connection.query(
            'INSERT INTO users (name,email,password) VALUES (?,?,?)',
            [username,email,hash],
            (error,results) => {
                req.session.userID = results.insertID;
                req.session.username = username;
                res.redirect('/index');
            }
        );
    });
});

/* routing end ----------------------------------- */



app.listen(process.env.PORT || 3000);
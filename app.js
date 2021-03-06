if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

const mongoSanitize = require('express-mongo-sanitize');

const userRoutes = require('./routes/users');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');

mongoose.connect(process.env.DB_URL, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection:'));
db.once('open', () => {
	console.log('Database Connected');
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true })); //parses data from HTML FORMS
app.use(methodOverride('_method')); //prefix for method-override URL
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize());

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const sessionStore = MongoStore.create({
	mongoUrl: process.env.DB_URL,
	secret,
	touchAfter: 24 * 60 * 60 // time period in seconds
});

sessionStore.on('error', function () {
	console.log('SESSION STORE ERROR', e);
});

const sessionConfig = {
	store: sessionStore,
	name: 'session',
	secret,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true, //security flag
		expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
		maxAge: 1000 * 60 * 60 * 24 * 7
	}
};
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
	'https://stackpath.bootstrapcdn.com/',
	'https://api.tiles.mapbox.com/',
	'https://api.mapbox.com/',
	'https://kit.fontawesome.com/',
	'https://cdnjs.cloudflare.com/',
	'https://cdn.jsdelivr.net'
];
const styleSrcUrls = [
	'https://kit-free.fontawesome.com/',
	'https://stackpath.bootstrapcdn.com/',
	'https://api.mapbox.com/',
	'https://api.tiles.mapbox.com/',
	'https://fonts.googleapis.com/',
	'https://cdn.jsdelivr.net',
	'https://use.fontawesome.com/'
];
const connectSrcUrls = [
	'https://api.mapbox.com/',
	'https://a.tiles.mapbox.com/',
	'https://b.tiles.mapbox.com/',
	'https://events.mapbox.com/'
];
const fontSrcUrls = [];
app.use(
	helmet.contentSecurityPolicy({
		directives: {
			defaultSrc: [],
			connectSrc: ["'self'", ...connectSrcUrls],
			scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
			styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
			workerSrc: ["'self'", 'blob:'],
			objectSrc: [],
			imgSrc: [
				"'self'",
				'blob:',
				'data:',
				'https://res.cloudinary.com/doytl5yki/', //SHOULD MATCH YOUR CLOUDINARY ACCOUNT!
				'https://images.unsplash.com/'
			],
			fontSrc: ["'self'", ...fontSrcUrls]
		}
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
	//locals gives us access to its locals.(xxx) INSIDE the template
	//without passing it through the request as usual
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.currentUser = req.user;
	next();
});

app.use('/', userRoutes);
app.use('/campgrounds', campgroundRoutes);
//to have access to :id we use  (mergeParams: true) inside router file
app.use('/campgrounds/:id/reviews', reviewRoutes);

app.get('/', (req, res) => {
	res.render('home');
});

//if there is no such a route (endpoint)
app.all('*', (req, res, next) => {
	next(new ExpressError('Page Does Not Exist', 404));
});

//error handler, here we get through the @next@ func
app.use((err, req, res, next) => {
	const { statusCode = 500 } = err;
	if (!err.message) err.message = 'Oh shoot! Something went wrong';
	res.status(statusCode).render('error', { err });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Serving on port: ${port}`);
});

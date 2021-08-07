const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const Campground = require('./models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection:'));
db.once('open', () => {
	console.log('Database Connected');
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
mongoose.set('useFindAndModify', false); //avoid deprecation warnings

app.use(express.urlencoded({ extended: true })); //parses data from HTML FORMS
app.use(methodOverride('_method')); //prefix for method-override URL

app.get('/', (req, res) => {
	res.render('home');
});

app.get('/campgrounds', async (req, res) => {
	const campgrounds = await Campground.find({}); //find\show all docs in db
	res.render('campgrounds/index', { campgrounds });
});

app.get('/campgrounds/new', (req, res) => {
	res.render('campgrounds/new');
});

app.get('/campgrounds/:id', async (req, res) => {
	const campground = await Campground.findById(req.params.id);
	res.render('campgrounds/show', { campground });
});

app.post('/campgrounds', async (req, res) => {
	const campground = new Campground(req.body.campground); // as usual we accept here an object, so body is an object
	await campground.save();
	res.redirect(`/campgrounds/${campground._id}`);
});

app.get('/campgrounds/:id/edit', async (req, res) => {
	const campground = await Campground.findById(req.params.id);
	res.render('campgrounds/edit', { campground });
});

app.put('/campgrounds/:id', async (req, res) => {
	const { id } = req.params;
	const campground = await Campground.findByIdAndUpdate(
		id,
		{ ...req.body.campground },
		{ new: true }
	);
	res.redirect(`/campgrounds/${campground._id}`);
});

app.delete('/campgrounds/:id', async (req, res) => {
	const { id } = req.params;
	const campground = await Campground.findByIdAndDelete(id);
	res.redirect(`/campgrounds`);
});

app.listen(3000, () => {
	console.log('Serving on port 3000');
});

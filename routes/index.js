var express = require('express');
var router = express.Router();

const PDFToolsSdk = require('@adobe/documentservices-pdftools-node-sdk');
const { Readable } = require('stream');

const { Client } = require('pg');
const streamBuffers = require('stream-buffers');

const credentials = PDFToolsSdk.Credentials
  .serviceAccountCredentialsBuilder()
  .fromFile("pdftools-api-credentials.json")
  .build();

const executionContext = PDFToolsSdk.ExecutionContext.create(credentials);

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Job Postings - Adobe Document Services API Demo' });
});

router.post('/upload', async function (req, res, next) {
  const name = req.body.name;
  const fileContents = req.files.attachment.data;

  const createPdfOperation = PDFToolsSdk.CreatePDF.Operation.createNew();
  const input = PDFToolsSdk.FileRef.createFromStream(Readable.from(fileContents), req.files.attachment.mimetype);
  createPdfOperation.setInput(input);
  let result = await createPdfOperation.execute(executionContext);

  const ocrOperation = PDFToolsSdk.OCR.Operation.createNew();
  ocrOperation.setInput(result);
  result = await ocrOperation.execute(executionContext);

  const compressPdfOperation = PDFToolsSdk.CompressPDF.Operation.createNew();
  compressPdfOperation.setInput(result);
  result = await compressPdfOperation.execute(executionContext);

  const pgClient = new Client();
  pgClient.connect();

  const id = Math.random().toString(36).substr(2, 6); // not securely random at all, but serves the purpose for this demo

  const writableStream = new streamBuffers.WritableStreamBuffer();
  writableStream.on('finish', async () => {    
    await pgClient.query("INSERT INTO job_postings VALUES ($1, $2, $3)", [
      id,
      name,
      writableStream.getContents()
    ]);
    res.redirect(`/job/${id}`);
  })
  result.writeToStream(writableStream);
});

router.get('/pdf/:id', async function (req, res, next) {
  const id = req.params.id;
  
  const pgClient = new Client();
  pgClient.connect();

  const pgResult = await pgClient.query("SELECT attachment FROM job_postings WHERE id = $1", [id]);
  const buffer = pgResult.rows[0].attachment;
  res.type('pdf');
  return res.send(buffer);
});

router.get('/job/:id', async function(req, res, next) {
  const id = req.params.id;

  const pgClient = new Client();
  pgClient.connect();

  const pgResult = await pgClient.query("SELECT name FROM job_postings WHERE id = $1", [id]);
  const name = pgResult.rows[0].name;

  res.render('job', { pdf_url: `/pdf/${id}`, name });
});

module.exports = router;

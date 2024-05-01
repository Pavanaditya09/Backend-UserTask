const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const dbPath = path.join(__dirname, 'usersandtask.db')
const app = express()

app.use(express.json())

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(-1)
  }
}
initializeDBAndServer()

//Authentication Middleware
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//User Register API
app.post('/users/', async (request, response) => {
  const {username, password} = request.body
  const hashedPassword = await bcrypt.hash(request.body.password, 10)
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        Users (username, password_hash) 
      VALUES 
        ( '${username}','${hashedPassword}')`
    await db.run(createUserQuery)
    response.send(`User created successfully`)
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//User Login API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM Users WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbUser.password_hash,
    )
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

// User Data
app.get('/data/', async (request, response) => {
  const selectUserQuery = `SELECT * FROM Users `
  const dbUser = await db.all(selectUserQuery)
  response.send(dbUser)
})

// Task Assigning to User
app.post('/tasks/', authenticateToken, async (request, response) => {
  const {title, description, status, assigneeid, createdat, updatedat} =
    request.body
  const selecttaskQuery = `SELECT * FROM Tasks WHERE title = '${title}'`
  const dbUser = await db.get(selecttaskQuery)
  if (dbUser === undefined) {
    const createTaskQuery = `
      INSERT INTO Tasks (title, description, status, assignee_id, created_at, updated_at) VALUES ('${title}','${description}','${status}',${assigneeid}, '${createdat}' , '${updatedat}' )`
    await db.run(createTaskQuery)
    response.send(`Task created successfully`)
  } else {
    response.status(400)
    response.send('Task  already exists')
  }
})

// All Task Assigned to Users
app.get('/tasks/', authenticateToken, async (request, response) => {
  const selecttaskQuery = `SELECT * FROM Tasks `
  const dbUser = await db.all(selecttaskQuery)
  response.send(dbUser)
})

app.get('/tasks/:id/', authenticateToken, async (request, response) => {
  const {id} = request.params
  const selecttaskQuery = `SELECT * FROM Tasks WHERE id = ${id}`
  const dbUser = await db.get(selecttaskQuery)
  response.send(dbUser)
})


/// Updating the Tasks
app.put('/tasks/:id/', authenticateToken, async (request, response) => {
  const {id} = request.params
  const {title, description, status, assigneeid, createdat, updatedat} =
    request.body
  const selecttaskQuery = `UPDATE Tasks SET title='${title}',description='${description}',status='${status}',assignee_id=${assigneeid},created_at='${createdat}',updated_at='${updatedat}'  FROM Tasks WHERE id =${id};`
  await db.run(selecttaskQuery)
  response.send('Task Update Succesfully')
})

// Deleting the Task
app.delete('/tasks/:id/', authenticateToken, async (request, response) => {
  const {id} = request.params
  const selecttaskQuery = `DELETE  FROM Tasks WHERE id =${id};`
  await db.run(selecttaskQuery)
  response.send('Task DELETED Succesfully')
})



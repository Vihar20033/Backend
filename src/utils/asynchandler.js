// requesthandler => Controller 
// (req , res , next) => Wrapper function return 
/**
    The main job of asynchandler is:
        To catch errors in async route handlers automatically.
        Forward them to Express’s error-handling middleware without crashing the app.
 */

const asynchandler = (requesthandler) => {
    return (req , res , next) => {
        Promise
         .resolve(requesthandler(req , res , next))
         .catch((err) => next(err))
    }
}

export { asynchandler }

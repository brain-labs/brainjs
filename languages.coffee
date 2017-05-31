@JSREPL::Languages::brain =
  system_name: 'brain'
  name: 'Brain'
  extension: 'brain'
  matchings: [
    ['[', ']']
    ['{', '}']
  ]
  scripts: [
    'extern/brain/brainjs.js'
  ]
  includes: []
  engine: 'langs/brainfuck/jsrepl_brain.coffee'
  minifier: 'closure'


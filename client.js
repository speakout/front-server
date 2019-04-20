(function() {
  var client = new EventSource('server_api')
  client.addEventListener('update', function() {
    location.reload()
  })
}())
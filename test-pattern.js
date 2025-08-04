const pattern = /^[A-Za-z0-9]{7}$/;
const invalidIds = ['dynamic_elevators', 'mountain_climbers', 'push_ups', 'burpees', 'abc', 'too_long_id'];
invalidIds.forEach(id => {
  const rejected = !pattern.test(id);
  console.log(id + ': ' + (rejected ? 'REJECTED' : 'ACCEPTED') + ' (length: ' + id.length + ')');
});
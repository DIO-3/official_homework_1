<script setup>
defineProps({ student: { type: Object, required: true }, busy: Boolean })
defineEmits(['delete'])
</script>

<template>
  <div class="table-wrap">
    <table>
      <caption>Student information</caption>
      <thead><tr><th>Name</th><th>ID</th><th>Phone</th><th>ZIP</th><th>Action</th></tr></thead>
      <tbody><tr>
        <td>{{ student.name }}</td><td>{{ student.id }}</td>
        <td>{{ student.phone }}</td><td>{{ student.zip }}</td>
        <td><button :disabled="busy" @click="$emit('delete', student)">Delete</button></td>
      </tr></tbody>
    </table>
  </div>
</template>

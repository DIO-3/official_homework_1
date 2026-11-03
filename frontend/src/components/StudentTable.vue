<script setup>
defineProps({
  students: { type: Array, required: true },
  busy: Boolean,
  removable: { type: Boolean, default: true },
  caption: { type: String, default: 'Student records' },
})
defineEmits(['delete'])
</script>

<template>
  <div class="table-wrap" tabindex="0" :aria-label="caption">
    <table>
      <caption class="sr-only">{{ caption }}</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Student ID</th><th scope="col">Phone</th><th scope="col">ZIP code</th><th v-if="removable" scope="col">Action</th></tr></thead>
      <tbody><tr v-for="student in students" :key="student.id">
        <th scope="row">{{ student.name }}</th><td class="record-id">{{ student.id }}</td>
        <td>{{ student.phone }}</td><td>{{ student.zip }}</td>
        <td v-if="removable"><button type="button" class="danger quiet" :disabled="busy"
          :aria-label="`Delete ${student.name} (${student.id})`" @click="$emit('delete', student)">Delete</button></td>
      </tr></tbody>
    </table>
  </div>
</template>

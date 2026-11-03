async function searchStudent(event) {
    event.preventDefault();
    const name = document.getElementById('studentName').value;

    try {
        const response = await fetch('http://localhost:3000/find-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (response.status === 404) {
            alert("Cannot find the student.");
            return;
        }

        if (!response.ok) {
            alert("An error occurred while searching for the student.");
            return;
        }

        const student = await response.json();
        document.getElementById('resultTable').innerHTML = `
            <tr>
                <td>${student.name}</td>
                <td>${student.id}</td>
                <td>${student.phone}</td>
                <td>${student.zip}</td>
                <td><button type="button" onclick="deleteStudent('${encodeURIComponent(student.name)}')">Delete</button></td>
            </tr>
        `;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while searching for the student.");
    }
}

async function deleteStudent(encodedName) {
    const name = decodeURIComponent(encodedName);

    if (!confirm(`Delete student ${name}?`)) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/delete-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (response.status === 404) {
            alert("Student not found or already deleted.");
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            alert(`Error: ${error.error}`);
            return;
        }

        alert("Student deleted successfully.");
        document.getElementById('resultTable').innerHTML = '';
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while deleting the student.");
    }
}

async function addStudent(event) {
    event.preventDefault();
    const name = document.getElementById('addName').value;
    const id = document.getElementById('addId').value;
    const phone = document.getElementById('addPhone').value;
    const zip = document.getElementById('addZip').value;

    try {
        const response = await fetch('http://localhost:3000/add-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, id, phone, zip })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(`Error: ${error.error}`);
            return;
        }

        alert("Student added successfully!");
        document.querySelector('form[onsubmit="addStudent(event)"]').reset();
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while adding the student.");
    }
}

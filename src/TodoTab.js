import React from 'react';
import jsPDF from 'jspdf';

const TodoTab = ({
  todoList,
  setTodoList,
  klantenserviceTodoList,
  setKlantenserviceTodoList
}) => {
  const exportServiceTodos = () => {
    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.text('Service To-Do Lijst', 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Gegenereerd op: ${new Date().toLocaleDateString('nl-NL')}`, 20, 30);
    pdf.text(`Aantal to-do's: ${todoList.length}`, 20, 35);
    
    let yPosition = 50;
    
    // To-do items
    todoList.forEach((todo, index) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${todo.text}`, 20, yPosition);
      yPosition += 8;
    });
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Pagina ${i} van ${pageCount}`, 20, 290);
    }
    
    pdf.save(`service_todos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportKlantenserviceTodos = () => {
    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.text('Klantenservice To-Do Lijst', 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Gegenereerd op: ${new Date().toLocaleDateString('nl-NL')}`, 20, 30);
    pdf.text(`Aantal to-do's: ${klantenserviceTodoList.length}`, 20, 35);
    
    let yPosition = 50;
    
    // To-do items
    klantenserviceTodoList.forEach((todo, index) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${todo.text}`, 20, yPosition);
      yPosition += 8;
    });
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Pagina ${i} van ${pageCount}`, 20, 290);
    }
    
    pdf.save(`klantenservice_todos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
  <div className="card">
    <h2>To-Do Lijsten</h2>
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Service To-Do's</h3>
        <button 
          className="btn btn-primary"
          onClick={exportServiceTodos}
          disabled={todoList.length === 0}
        >
          Export PDF
        </button>
      </div>
      <ul>
        {todoList.map((todo, index) => (
          <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => {
                const newList = [...todoList];
                newList[index].done = e.target.checked;
                setTodoList(newList);
              }}
            />
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Klantenservice To-Do's</h3>
        <button 
          className="btn btn-primary"
          onClick={exportKlantenserviceTodos}
          disabled={klantenserviceTodoList.length === 0}
        >
          Export PDF
        </button>
      </div>
      <ul>
        {klantenserviceTodoList.map((todo, index) => (
          <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => {
                const newList = [...klantenserviceTodoList];
                newList[index].done = e.target.checked;
                setKlantenserviceTodoList(newList);
              }}
            />
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  </div>
  );
};

export default TodoTab; 
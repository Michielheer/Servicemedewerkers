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
    
    {/* Service To-Do's - Mobiel vriendelijk */}
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h3>Service To-Do's ({todoList.length})</h3>
        <button 
          className="btn btn-primary"
          onClick={exportServiceTodos}
          disabled={todoList.length === 0}
          style={{ minWidth: '120px' }}
        >
          📄 Export PDF
        </button>
      </div>
      
      {todoList.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Geen service to-do's beschikbaar
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {todoList.map((todo, index) => (
            <div 
              key={index} 
              className={`todo-card ${todo.done ? 'completed' : ''}`}
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.done}
                onChange={(e) => {
                  const newList = [...todoList];
                  newList[index].done = e.target.checked;
                  setTodoList(newList);
                }}
              />
              <div className={`todo-text ${todo.done ? 'completed' : ''}`}>
                {todo.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Klantenservice To-Do's - Mobiel vriendelijk */}
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h3>Klantenservice To-Do's ({klantenserviceTodoList.length})</h3>
        <button 
          className="btn btn-primary"
          onClick={exportKlantenserviceTodos}
          disabled={klantenserviceTodoList.length === 0}
          style={{ minWidth: '120px' }}
        >
          📄 Export PDF
        </button>
      </div>
      
      {klantenserviceTodoList.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Geen klantenservice to-do's beschikbaar
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {klantenserviceTodoList.map((todo, index) => (
            <div 
              key={index} 
              className={`todo-card ${todo.done ? 'completed' : ''}`}
              style={{ 
                display: 'flex', 
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.done}
                onChange={(e) => {
                  const newList = [...klantenserviceTodoList];
                  newList[index].done = e.target.checked;
                  setKlantenserviceTodoList(newList);
                }}
              />
              <div className={`todo-text ${todo.done ? 'completed' : ''}`}>
                {todo.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

export default TodoTab; 
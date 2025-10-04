import React from 'react';

const TodoTab = ({
  todoList,
  setTodoList,
  klantenserviceTodoList,
  setKlantenserviceTodoList
}) => {

  return (
  <div className="card">
    <h2>To-Do Lijsten</h2>
    
    {/* Service To-Do's - Mobiel vriendelijk */}
    <div className="card">
      <h3>Service To-Do's ({todoList.length})</h3>
      
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
      <h3>Klantenservice To-Do's ({klantenserviceTodoList.length})</h3>
      
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
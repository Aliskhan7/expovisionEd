'use client';

import React, { useState } from 'react';
import { testConnection, getLessonChatHistory, sendLessonMessage } from '@/lib/api';

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test 1: Basic connection
    console.log('Testing basic connection...');
    try {
      testResults.connection = await testConnection();
    } catch (error) {
      testResults.connection = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 2: Test lesson chat history (without auth)
    console.log('Testing lesson chat history...');
    try {
      testResults.lessonHistory = await getLessonChatHistory(1);
    } catch (error) {
      testResults.lessonHistory = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    setResults(testResults);
    setLoading(false);
  };

  const testLessonMessage = async () => {
    setLoading(true);
    try {
      const result = await sendLessonMessage(1, {
        content: 'Test message',
        lesson_id: 1,
        course_id: 1
      });
      setResults(prev => ({ ...prev, sendMessage: { success: true, result } }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        sendMessage: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }));
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">API Diagnostic Tool</h1>
      
      <div className="space-y-4">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Run Connection Tests'}
        </button>

        <button
          onClick={testLessonMessage}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 ml-2"
        >
          {loading ? 'Testing...' : 'Test Lesson Message'}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Test Results:</h2>
          <pre className="bg-white p-4 rounded border overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Debug Info:</h2>
        <div className="bg-white p-4 rounded border">
          <p><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'relative paths'}</p>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
};

export default ApiTest; 
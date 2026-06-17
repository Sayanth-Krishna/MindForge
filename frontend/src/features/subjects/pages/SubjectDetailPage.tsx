import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { 
  FileText, 
  MessageSquare, 
  BookOpen,
  HelpCircle, 
  Upload, 
  Trash2, 
  Sparkles, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw,
  Check,
  X,
  AlertCircle,
  Plus,
  Edit2,
  Download
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  summary?: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  documentId?: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ chunkId: string; documentName: string; pageNumber: number | null }>;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions?: QuizQuestion[];
  createdAt: string;
}

export const SubjectDetailPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'documents' | 'chat' | 'flashcards' | 'quizzes'>('documents');
  
  // 1. Fetch Subject Meta Details
  const { data: subject, error: subjectError } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: async () => {
      const response = await api.get(`/subjects/${subjectId}`);
      return response.data.data;
    },
  });

  // Redirect if subject loading errors or not found
  useEffect(() => {
    if (subjectError) {
      navigate('/');
    }
  }, [subjectError, navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const deleteSubjectMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/subjects/${subjectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      navigate('/');
    },
    onError: (err) => {
      console.error('Error deleting subject:', err);
      toast.error('Failed to delete subject.');
    }
  });

  const handleOpenEdit = () => {
    if (subject) {
      setEditName(subject.name);
      setEditDescription(subject.description || '');
      setShowEditModal(true);
    }
  };

  const updateSubjectMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      await api.put(`/subjects/${subjectId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowEditModal(false);
    },
    onError: (err) => {
      console.error('Error updating subject:', err);
      toast.error('Failed to update subject.');
    }
  });

  const handleUpdateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateSubjectMutation.mutate({
      name: editName.trim(),
      description: editDescription.trim(),
    });
  };

  // ==========================================
  // TAB 1: DOCUMENTS STATE & MUTATIONS
  // ==========================================
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [summaryDocName, setSummaryDocName] = useState<string>('');
  const [summarizingDocId, setSummarizingDocId] = useState<string | null>(null);

  const { data: documents, refetch: refetchDocuments } = useQuery<Document[]>({
    queryKey: ['documents', subjectId],
    queryFn: async () => {
      const response = await api.get(`/documents/subject/${subjectId}`);
      return response.data.data;
    },
    enabled: !!subjectId,
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress('Uploading PDF to storage...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', subjectId!);

      setUploadProgress('Extracting pages and generating text segments...');
      
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFile(null);
      setUploadProgress('Success!');
      refetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed: Please make sure it is a valid PDF under 10MB.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      refetchDocuments();
      queryClient.invalidateQueries({ queryKey: ['documents', subjectId] });
    },
  });
  const handleSummarize = async (docId: string) => {
    setSummarizingDocId(docId);
    const doc = documents?.find((d) => d.id === docId);
    if (doc) {
      setSummaryDocName(doc.name);
    }
    try {
      const response = await api.post(`/documents/${docId}/summarize`);
      setActiveSummary(response.data.data.summary);
    } catch (err) {
      console.error(err);
      toast.error('Could not compile AI summary.');
    } finally {
      setSummarizingDocId(null);
    }
  };

  const downloadSummaryAsPdf = () => {
    if (!activeSummary) return;

    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - 2 * margin;

      // Clean metadata text
      const subjectName = subject?.name || 'Subject Notes';
      const docName = summaryDocName || 'Document';
      const dateStr = new Date().toLocaleDateString();

      // Title/Header Styling
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55); // Gray-800
      doc.text('MindForge Study Summary', margin, 25);

      // Metadata Box border and info
      doc.setDrawColor(229, 231, 235); // Gray-200
      doc.setLineWidth(0.5);
      doc.line(margin, 30, pageWidth - margin, 30);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.text(`Subject: ${subjectName}`, margin, 36);
      doc.text(`Source: ${docName}`, margin, 42);
      doc.text(`Date: ${dateStr}`, pageWidth - margin - doc.getTextWidth(`Date: ${dateStr}`), 36);

      doc.line(margin, 46, pageWidth - margin, 46);

      // Summary Content Body
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81); // Gray-700

      // Split the text into lines that fit the page width
      // Since jsPDF's splitTextToSize wraps lines, we first split by newlines to respect paragraph breaks
      const paragraphs = activeSummary.split('\n');
      let yPosition = 55;
      const lineHeight = 6;

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        if (!paragraph) continue;
        
        // Handle markdown/plain headers if they start with '#' or similar styling
        let isHeader = false;
        let cleanParagraph = paragraph;
        if (paragraph.startsWith('###')) {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(17, 24, 39); // Gray-900
          cleanParagraph = paragraph.replace(/^###\s*/, '');
          isHeader = true;
        } else if (paragraph.startsWith('##')) {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(17, 24, 39); // Gray-900
          cleanParagraph = paragraph.replace(/^##\s*/, '');
          isHeader = true;
        } else if (paragraph.startsWith('#')) {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(17, 24, 39); // Gray-900
          cleanParagraph = paragraph.replace(/^#\s*/, '');
          isHeader = true;
        } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(31, 41, 55);
          cleanParagraph = paragraph.replace(/\*\*/g, '');
        } else {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 81); // Gray-700
          cleanParagraph = paragraph.replace(/\*\*/g, '');
        }

        const lines = doc.splitTextToSize(cleanParagraph, contentWidth);
        
        // Check if writing these lines will exceed the page height
        const blockHeight = lines.length * lineHeight;
        if (yPosition + blockHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin; // Reset to top margin on new page
        }

        for (let j = 0; j < lines.length; j++) {
          doc.text(lines[j], margin, yPosition);
          yPosition += lineHeight;
        }

        // Add extra space between paragraphs
        yPosition += isHeader ? 2 : 4;
      }

      // Add Page Numbers on all pages
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175); // Gray-400
        doc.text(`Page ${p} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Sanitize filename to download
      const safeDocName = docName.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`${safeDocName}_summary.pdf`);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      toast.error('Could not download PDF. Please try again.');
    }
  };
  // ==========================================
  // TAB 2: RAG CHAT STATE & MUTATIONS
  // ==========================================
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Chat Sessions
  useEffect(() => {
    if (activeTab === 'chat' && subjectId) {
      api.get(`/chat/sessions?subjectId=${subjectId}`)
        .then((res) => {
          const fetchedSessions = res.data.data;
          setSessions(fetchedSessions);
          if (fetchedSessions.length > 0 && !activeSessionId) {
            setActiveSessionId(fetchedSessions[0].id);
          }
        });
    }
  }, [activeTab, subjectId, activeSessionId]);

  // Fetch Session Messages
  useEffect(() => {
    if (activeSessionId) {
      api.get(`/chat/sessions/${activeSessionId}/messages`)
        .then((res) => {
          setMessages(res.data.data);
        });
    } else {
      setTimeout(() => {
        setMessages([]);
      }, 0);
    }
  }, [activeSessionId]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateSession = async () => {
    const title = `Session ${sessions.length + 1}`;
    try {
      const res = await api.post('/chat/sessions', {
        title,
        subjectId,
      });
      const newSession = res.data.data;
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    if (!window.confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    try {
      await api.delete(`/chat/sessions/${sessionIdToDelete}`);
      
      // Remove from frontend list
      const updatedSessions = sessions.filter((s) => s.id !== sessionIdToDelete);
      setSessions(updatedSessions);

      // If we deleted the currently active session, activate another one (or set to null)
      if (sessionIdToDelete === activeSessionId) {
        if (updatedSessions.length > 0) {
          setActiveSessionId(updatedSessions[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Failed to delete chat session.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSessionId || sendingMessage) return;

    const userText = chatInput.trim();
    setChatInput('');
    setSendingMessage(true);

    // Optimistically push User Message to UI
    const tempUserMsg: ChatMessage = {
      id: 'temp-user',
      role: 'user',
      content: userText,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.post(`/chat/sessions/${activeSessionId}/messages`, {
        content: userText,
      });

      const { assistantMessage } = response.data.data;
      // Replace messages list with real DB sync
      setMessages((prev) => 
        prev.filter((m) => m.id !== 'temp-user').concat([
          { id: response.data.data.userMessage.id, role: 'user', content: userText },
          { 
            id: assistantMessage.id, 
            role: 'assistant', 
            content: assistantMessage.content, 
            sources: assistantMessage.sources 
          }
        ])
      );
    } catch (err) {
      console.error(err);
      toast.error('Could not deliver chat message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // ==========================================
  // TAB 3: FLASHCARDS STATE & MUTATIONS
  // ==========================================
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDocIdForCards, setSelectedDocIdForCards] = useState<string>('');

  const fetchFlashcards = useCallback(() => {
    if (subjectId) {
      api.get(`/flashcards/subject/${subjectId}`)
        .then((res) => {
          setFlashcards(res.data.data);
          setCurrentCardIndex(0);
          setIsFlipped(false);
        });
    }
  }, [subjectId]);

  useEffect(() => {
    if (activeTab === 'flashcards') {
      fetchFlashcards();
    }
  }, [activeTab, fetchFlashcards]);

  const handleGenerateFlashcards = async () => {
    setGeneratingCards(true);
    try {
      await api.post('/flashcards/generate', {
        subjectId,
        documentId: selectedDocIdForCards || undefined,
        count: 5,
      });
      fetchFlashcards();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate AI flashcards. Make sure you have uploaded PDFs with text.');
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    try {
      await api.delete(`/flashcards/${id}`);
      setFlashcards(flashcards.filter((card) => card.id !== id));
      if (currentCardIndex >= flashcards.length - 1) {
        setCurrentCardIndex(Math.max(0, flashcards.length - 2));
      }
      setIsFlipped(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // TAB 4: QUIZZES STATE & MUTATIONS
  // ==========================================
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [selectedDocIdForQuiz, setSelectedDocIdForQuiz] = useState<string>('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const fetchQuizzes = useCallback(() => {
    if (subjectId) {
      api.get(`/quizzes/subject/${subjectId}`)
        .then((res) => {
          setQuizzes(res.data.data);
        });
    }
  }, [subjectId]);

  useEffect(() => {
    if (activeTab === 'quizzes') {
      fetchQuizzes();
    }
  }, [activeTab, fetchQuizzes]);

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const title = `Quiz on ${documents?.find((d) => d.id === selectedDocIdForQuiz)?.name || 'Study Notes'}`;
      await api.post('/quizzes/generate', {
        title,
        subjectId,
        documentId: selectedDocIdForQuiz || undefined,
        count: 5,
      });
      fetchQuizzes();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate AI Quiz. Make sure you have uploaded PDFs with text.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      setActiveQuiz(response.data.data);
      setQuizAnswers({});
      setQuizSubmitted(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleQuizSubmit = () => {
    if (!activeQuiz?.questions) return;
    
    // Validate if all questions are answered
    if (Object.keys(quizAnswers).length < activeQuiz.questions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setQuizSubmitted(true);
  };

  const calculateScore = () => {
    if (!activeQuiz?.questions) return 0;
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctOptionIndex) {
        score++;
      }
    });
    return score;
  };

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/quizzes/${id}`);
    },
    onSuccess: () => {
      fetchQuizzes();
    },
  });

  return (
    <div className="min-h-screen bg-background/95 pb-10">
      <title>{`${subject?.name || 'Loading Subject...'} | MindForge`}</title>
      <meta 
        name="description" 
        content={
          subject?.description 
            ? `${subject.name} - ${subject.description}. Upload study notes, converse with documents via AI RAG chat, and generate customized flashcards and quizzes.`
            : `Study workspace for ${subject?.name || 'your subject'}. Upload study notes, converse with documents via AI RAG chat, and generate customized flashcards and quizzes.`
        } 
      />
      {/* Subject Header */}
      <div className="h-14 px-6 border-b border-border/60 flex items-center justify-between bg-card/10 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 animate-fade-in">
          <div 
            className="w-3.5 h-3.5 rounded-full shadow-sm" 
            style={{ backgroundColor: subject?.color || '#a855f7' }}
          />
          <h2 className="font-bold text-foreground text-base tracking-tight">{subject?.name || 'Loading Subject...'}</h2>
          
          {subject && (
            <>
              <button
                onClick={handleOpenEdit}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ml-2"
                title="Edit Subject"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Tab Links */}
        <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-lg border border-border/50 text-xs">
          {([
            { id: 'documents', label: 'Notes', icon: FileText },
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
            { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Description Banner if it exists */}
      {subject?.description && (
        <div className="px-6 py-3 bg-secondary/15 border-b border-border/40 text-xs text-muted-foreground animate-fade-in">
          {subject.description}
        </div>
      )}

      {/* Dynamic Tab Body */}
      <div className="p-6 max-w-6xl mx-auto">
        {/* ==========================================
            TAB 1: DOCUMENTS / NOTES VIEW
            ========================================== */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-fade-in">
            {/* Upload PDF Section */}
            <div className="glass p-6 rounded-xl border border-border">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <span>Upload Study Materials</span>
              </h3>
              <p className="text-muted-foreground text-xs mt-1">Upload PDF lecture slides, textbook sections, or summaries to feed the RAG engine.</p>
              
              <form onSubmit={handleUpload} className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex-1 flex items-center justify-center border border-dashed border-border hover:border-primary/50 bg-background/20 rounded-lg py-3 px-4 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px] sm:max-w-none text-foreground">
                      {file ? file.name : 'Choose a PDF document (Max 10MB)'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="px-5 py-3 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Vector Index...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Index PDF</span>
                    </>
                  )}
                </button>
              </form>

              {uploading && uploadProgress && (
                <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}
            </div>

            {/* Documents List */}
            <div>
              <h4 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Uploaded Documents</h4>
              
              {documents && documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border border-border/80 bg-card/30 rounded-xl p-5 flex flex-col justify-between hover:border-border transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate" title={doc.name}>
                            {doc.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Math.round(doc.fileSize / 1024)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40 justify-end">
                        <button
                          onClick={() => handleSummarize(doc.id)}
                          disabled={summarizingDocId === doc.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/10 text-primary transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {summarizingDocId === doc.id ? (
                            <>
                              <RotateCw className="w-3 h-3 animate-spin" />
                              <span>Summarizing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI Summary</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteDocMutation.mutate(doc.id)}
                          className="p-1.5 rounded-lg text-xs hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete PDF"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/10">
                  <FileText className="w-8 h-8 text-muted-foreground stroke-1 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">No documents uploaded</p>
                  <p className="text-xs text-muted-foreground mt-1">Files you upload will be chunked and indexed here.</p>
                </div>
              )}
            </div>

            {/* AI Summary Dialog/Card */}
            {activeSummary && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-2xl bg-card border border-border p-6 rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>AI Document Summary</span>
                    </h3>
                    <button 
                      onClick={() => setActiveSummary(null)}
                      className="p-1 hover:bg-secondary rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto py-4 text-sm leading-relaxed prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-line text-foreground/90">{activeSummary}</div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <button
                      onClick={downloadSummaryAsPdf}
                      className="px-4 py-2 text-xs font-bold border border-border bg-transparent hover:bg-secondary text-foreground rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => setActiveSummary(null)}
                      className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                    >
                      Close Summary
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 2: RAG CHAT VIEW
            ========================================== */}
        {activeTab === 'chat' && (
          <div className="h-[75vh] flex gap-4 animate-fade-in">
            {/* Session Navigation Bar */}
            <div className="w-56 shrink-0 border border-border/80 bg-card/20 rounded-xl p-3 flex flex-col gap-2">
              <button
                onClick={handleCreateSession}
                className="w-full py-2 flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 hover:border-primary/50 text-xs font-bold text-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>

              <div className="flex-1 overflow-y-auto space-y-1 mt-2">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div 
                      key={sess.id} 
                      className={`group w-full flex items-center justify-between rounded-lg transition-colors ${
                        isActive ? 'bg-secondary text-foreground font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                      }`}
                    >
                      <button
                        onClick={() => setActiveSessionId(sess.id)}
                        className="flex-1 text-left px-3 py-2 text-xs font-semibold truncate cursor-pointer"
                      >
                        {sess.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(sess.id);
                        }}
                        className="px-2 py-2 mr-1 rounded-md opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Dialog Column */}
            <div className="flex-1 border border-border/80 bg-card/10 rounded-xl flex flex-col overflow-hidden relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                          isUser
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-secondary text-foreground rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                          
                          {/* Citations references */}
                          {!isUser && msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-1">
                              <p className="font-semibold text-foreground/80">Retrieved Citations:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.sources.map((src, i) => (
                                  <span 
                                    key={i} 
                                    className="px-2 py-0.5 rounded bg-background/50 border border-border/50 text-muted-foreground font-medium hover:text-foreground cursor-help"
                                    title={`Page ${src.pageNumber || 'N/A'} of ${src.documentName}`}
                                  >
                                    Doc: {src.documentName.slice(0, 15)}... pg.{src.pageNumber || 'N/A'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare className="w-10 h-10 text-muted-foreground stroke-1 mb-3 animate-bounce" />
                    <p className="text-sm font-semibold text-foreground">Ask questions about your notes</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      MindForge will retrieve the most relevant sections from your documents and assemble the answer.
                    </p>
                  </div>
                )}
                {sendingMessage && (
                  <div className="flex items-start">
                    <div className="bg-secondary text-foreground rounded-xl rounded-bl-none px-4 py-3 text-sm flex items-center gap-1.5 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card/25 flex gap-2">
                <input
                  type="text"
                  placeholder={activeSessionId ? "Ask a question..." : "Create a session first"}
                  disabled={!activeSessionId || sendingMessage}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground text-sm"
                />
                <button
                  type="submit"
                  disabled={!activeSessionId || !chatInput.trim() || sendingMessage}
                  className="p-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: AI FLASHCARDS VIEW
            ========================================== */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
            {/* Flashcards control panel */}
            <div className="glass p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border">
              <div>
                <h3 className="font-bold text-sm text-foreground">Generate AI Flashcards</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Generate flashcards from all notes or choose a specific document.</p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={selectedDocIdForCards}
                  onChange={(e) => setSelectedDocIdForCards(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-border bg-background/50 text-foreground"
                >
                  <option value="">All Documents</option>
                  {documents?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name.slice(0, 20)}...
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateFlashcards}
                  disabled={generatingCards || !documents || documents.length === 0}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {generatingCards ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Cards</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Flashcard Active Flip Panel */}
            {flashcards.length > 0 ? (
              <div className="space-y-4">
                {/* Flip Card Wrapper */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="h-64 cursor-pointer relative rounded-xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-center justify-center p-6 text-center select-none shadow-md overflow-hidden"
                >
                  {/* Visual card decoration */}
                  <div className="absolute top-3 left-4 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Card {currentCardIndex + 1} of {flashcards.length}
                  </div>
                  <div className="absolute top-3 right-4 text-[9px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                    {isFlipped ? 'Answer' : 'Question'}
                  </div>

                  <p className={`text-base font-medium max-w-md ${isFlipped ? 'text-primary font-semibold' : 'text-foreground'}`}>
                    {isFlipped ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front}
                  </p>
                </div>

                {/* Flip navigation buttons */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => handleDeleteFlashcard(flashcards[currentCardIndex].id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Delete Card
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                        setIsFlipped(false);
                      }}
                      disabled={currentCardIndex === 0}
                      className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {currentCardIndex + 1} / {flashcards.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                        setIsFlipped(false);
                      }}
                      disabled={currentCardIndex === flashcards.length - 1}
                      className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/10">
                <BookOpen className="w-10 h-10 text-muted-foreground stroke-1 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No flashcards yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click "Generate Cards" above to analyze your documents and automatically construct flashcard decks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 4: AI QUIZZES VIEW
            ========================================== */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
            {/* Active Quiz taking flow */}
            {activeQuiz ? (
              <div className="space-y-6">
                {/* Active Quiz Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="font-bold text-lg text-foreground">{activeQuiz.title}</h3>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground"
                  >
                    Exit Quiz
                  </button>
                </div>

                {/* Quiz Questions loop */}
                <div className="space-y-8">
                  {activeQuiz.questions?.map((q, qIdx) => (
                    <div key={q.id} className="border border-border/80 bg-card/20 p-5 rounded-xl space-y-4">
                      <h4 className="font-bold text-sm text-foreground flex gap-2">
                        <span>{qIdx + 1}.</span>
                        <span>{q.question}</span>
                      </h4>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[qIdx] === optIdx;
                          const showCorrect = quizSubmitted && q.correctOptionIndex === optIdx;
                          const showWrong = quizSubmitted && isSelected && q.correctOptionIndex !== optIdx;

                          let btnStyle = 'border border-border hover:bg-secondary/40 text-foreground';
                          if (isSelected) btnStyle = 'border-primary bg-primary/10 text-primary font-semibold';
                          if (showCorrect) btnStyle = 'border-green-500 bg-green-500/10 text-green-500 font-semibold';
                          if (showWrong) btnStyle = 'border-destructive bg-destructive/10 text-destructive font-semibold';

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              className={`text-left p-3.5 rounded-lg text-xs transition-colors flex justify-between items-center ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {showCorrect && <Check className="w-4 h-4 shrink-0 text-green-500" />}
                              {showWrong && <X className="w-4 h-4 shrink-0 text-destructive" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {quizSubmitted && q.explanation && (
                        <div className="p-3 bg-secondary/40 border border-border/60 rounded-lg text-xs text-muted-foreground flex gap-2.5 items-start">
                          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground/80">Explanation:</span>{' '}
                            <span>{q.explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Score panel */}
                {quizSubmitted ? (
                  <div className="glass p-6 rounded-xl border border-border text-center space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">Quiz Completed!</h4>
                      <p className="text-muted-foreground text-xs mt-1">Review the explanations above to solidify your learnings.</p>
                    </div>

                    <div className="inline-block p-4 rounded-full bg-primary/15 text-primary">
                      <span className="text-3xl font-extrabold">{calculateScore()}</span>
                      <span className="text-muted-foreground text-sm font-semibold"> / {activeQuiz.questions?.length}</span>
                    </div>

                    <div>
                      <button
                        onClick={() => handleStartQuiz(activeQuiz.id)}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Retake Quiz</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={handleQuizSubmit}
                      className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                    >
                      Submit Answers
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Quiz generator panel & history
              <div className="space-y-6 animate-fade-in">
                <div className="glass p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Generate AI Study Quiz</h3>
                    <p className="text-muted-foreground text-xs mt-0.5">Assemble dynamic multi-choice quizzes based on your course material.</p>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={selectedDocIdForQuiz}
                      onChange={(e) => setSelectedDocIdForQuiz(e.target.value)}
                      className="text-xs px-2.5 py-2 rounded-lg border border-border bg-background/50 text-foreground"
                    >
                      <option value="">All Documents</option>
                      {documents?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name.slice(0, 20)}...
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={generatingQuiz || !documents || documents.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {generatingQuiz ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quizzes List */}
                <div>
                  <h4 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Available Quizzes</h4>
                  
                  {quizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quizzes.map((q) => (
                        <div key={q.id} className="border border-border/80 bg-card/30 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-border transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                              <HelpCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-foreground truncate" title={q.title}>{q.title}</h5>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Created on {new Date(q.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartQuiz(q.id)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              Attempt
                            </button>
                            <button
                              onClick={() => deleteQuizMutation.mutate(q.id)}
                              className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                              title="Delete Quiz"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/10">
                      <HelpCircle className="w-10 h-10 text-muted-foreground stroke-1 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">No quizzes generated yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Generate Quiz" to analyze your PDFs and create MCQs.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Subject Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl flex flex-col animate-scale-up">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Delete Subject?</span>
            </h3>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{subject?.name}</strong>? This action cannot be undone and will permanently delete all associated documents, AI summaries, chat sessions, flashcards, and quizzes.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                disabled={deleteSubjectMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSubjectMutation.mutate()}
                className="px-4 py-2 text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors flex items-center gap-1.5"
                disabled={deleteSubjectMutation.isPending}
              >
                {deleteSubjectMutation.isPending ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Subject</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form 
            onSubmit={handleUpdateSubject} 
            className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl flex flex-col animate-scale-up"
          >
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              <span>Edit Subject Details</span>
            </h3>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary text-foreground text-sm"
                  placeholder="e.g. Computer Science 101"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary text-foreground text-sm h-24 resize-none"
                  placeholder="Optional description of this subject..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                disabled={updateSubjectMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-1.5"
                disabled={updateSubjectMutation.isPending}
              >
                {updateSubjectMutation.isPending ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

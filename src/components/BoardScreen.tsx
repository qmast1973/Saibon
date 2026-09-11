import React, { useState, useEffect } from 'react';
import { User, BoardPost } from '../types';
import { subscribeToBoardPosts, addBoardPost, deleteBoardPost, updateBoardPost, addBoardComment, deleteBoardComment } from '../lib/firebase';
import { MessageSquare, Plus, Trash2, X, Edit2 } from 'lucide-react';

import { ArrowLeft } from 'lucide-react';

interface BoardScreenProps {
  onClose: () => void;
  currentUser: User;
}

export const BoardScreen: React.FC<BoardScreenProps> = ({ currentUser, onClose }) => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBoardPosts((data) => {
      setPosts(data);
    });
    return () => unsubscribe();
  }, []);


  const handleCommentSubmit = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    setSubmittingComment(postId);
    try {
      await addBoardComment(postId, {
        content: text.trim(),
        authorName: currentUser.name,
        authorUsername: currentUser.username,
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('댓글 작성 오류:', err);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleCommentDelete = async (postId: string, commentId: string) => {
    try {
      await deleteBoardComment(postId, commentId);
      setConfirmDeleteCommentId(null);
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addBoardPost({
        title: title.trim(),
        content: content.trim(),
        authorName: currentUser.name,
        authorUsername: currentUser.username,
      });
      setShowModal(false);
      setTitle('');
      setContent('');
    } catch (err) {
      console.error('게시글 작성 오류:', err);
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBoardPost(id);
      setConfirmDeletePostId(null);
    } catch (err) {
      console.error('글 삭제 오류:', err);
      alert('글 삭제에 실패했습니다.');
    }
  };

  const handleEditStart = (post: BoardPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleEditCancel = () => {
    setEditingPostId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleEditSubmit = async (postId: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setIsEditSubmitting(true);
    try {
      await updateBoardPost(postId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingPostId(null);
    } catch (err) {
      console.error('글 수정 오류:', err);
      alert('글 수정에 실패했습니다.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gray-900 z-[180] overflow-y-auto pt-16">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 w-full h-14 bg-gray-900 border-b border-gray-800 z-50 flex items-center px-4 shadow-sm">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로</span>
        </button>
        <div className="flex-1 font-bold text-center text-lg text-gray-100 pr-10">소통 게시판</div>
      </div>

    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-32 mt-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            자유로운 소통
          </h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          글쓰기
        </button>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl shadow-sm border border-gray-800">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">아직 등록된 게시글이 없습니다.</p>
            <p className="text-gray-500 text-sm mt-1">첫 번째 글을 남겨보세요!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-800 hover:shadow-md transition">
              {editingPostId === post.id ? (
                <div className="mb-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    placeholder="제목"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-y"
                    placeholder="내용"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-800"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleEditSubmit(post.id)}
                      disabled={isEditSubmitting}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                    >
                      {isEditSubmitting ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-100">{post.title}</h3>
                    {(currentUser.username === post.authorUsername || currentUser.role === 'admin') && (
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        <button
                          onClick={() => handleEditStart(post)}
                          className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/50 rounded-lg transition"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {confirmDeletePostId === post.id ? (
                          <div className="flex items-center gap-1 bg-red-900/40 px-2 py-1 rounded-lg border border-red-700/50">
                            <span className="text-xs text-red-200 font-bold mr-1">삭제할까요?</span>
                            <button onClick={() => handleDelete(post.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded">확인</button>
                            <button onClick={() => setConfirmDeletePostId(null)} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">취소</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (post.authorUsername !== currentUser.username && currentUser.role !== 'admin') {
                                alert('본인이 작성한 글만 삭제할 수 있습니다.');
                                return;
                              }
                              setConfirmDeletePostId(post.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap mb-4 text-sm leading-relaxed">
                    {post.content}
                  </p>
                </>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <span className="bg-gray-100 px-2 py-1 rounded-md">{post.authorName}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              
              {/* Comments Section */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="space-y-3 mb-3">
                  {post.comments && Object.entries(post.comments).map(([commentId, comment]: [string, any]) => (
                    <div key={commentId} className="flex justify-between items-start group bg-gray-800/50 p-2.5 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-xs text-gray-100">{comment.authorName}</span>
                          <span className="text-[10px] text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {(currentUser.username === comment.authorUsername || currentUser.role === 'admin') && (
                        confirmDeleteCommentId === commentId ? (
                          <div className="flex items-center gap-1 bg-red-900/40 px-2 py-0.5 rounded border border-red-700/50 ml-2">
                            <button onClick={() => handleCommentDelete(post.id, commentId)} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-1.5 py-0.5 rounded">삭제 확인</button>
                            <button onClick={() => setConfirmDeleteCommentId(null)} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-1.5 py-0.5 rounded">취소</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteCommentId(commentId)}
                            className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 sm:opacity-100 ml-2"
                            title="댓글 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommentSubmit(post.id);
                      }
                    }}
                    placeholder="댓글을 남겨보세요..."
                    className="flex-1 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    onClick={() => handleCommentSubmit(post.id)}
                    disabled={!commentInputs[post.id]?.trim() || submittingComment === post.id}
                    className="px-4 py-2 bg-indigo-900/50 text-indigo-400 font-semibold rounded-xl text-sm hover:bg-indigo-100 transition disabled:opacity-50"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50/50">
              <h3 className="text-lg font-bold text-gray-100">새 게시글 작성</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
              >
                [닫기]
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                    placeholder="제목을 입력하세요"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">내용</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[160px] resize-y"
                    placeholder="내용을 자유롭게 남겨주세요"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-800 transition"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

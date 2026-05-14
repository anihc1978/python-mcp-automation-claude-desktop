from server import get_transcript

# Test with a short public video
t = get_transcript("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
print(t[:500])
